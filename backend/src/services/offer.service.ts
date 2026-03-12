import { Request, Response } from "express";
import { Offer } from "../models/offer.model";
import { success, fail } from "../utils/response";
import { uploadToMinio, deleteFromMinio } from "./minio.service";
import { recordAudit } from "./audit.service";

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

const uploadOfferImage = async (req: Request): Promise<string | undefined> => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return undefined;
  return uploadToMinio(file.buffer, file.originalname, file.mimetype, "offers");
};

const getActorId = (req: Request): string | undefined => {
  const currentUser = (req as Request & { user?: { id?: string; _id?: string } | null }).user;
  if (currentUser?.id) return currentUser.id;
  if (currentUser?._id) return String(currentUser._id);
  return undefined;
};

export const getOffers = async (_req: Request, res: Response) => {
  try {
    const offers = await Offer.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return success(res, offers, "Offers fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fetch failed";
    return fail(res, message, 500);
  }
};

export const listAllOffers = async (_req: Request, res: Response) => {
  try {
    const offers = await Offer.find({})
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return success(res, offers, "Offers fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fetch failed";
    return fail(res, message, 500);
  }
};

export const createOffer = async (req: Request, res: Response) => {
  try {
    const uploadedImageUrl = await uploadOfferImage(req);
    const fallbackImage = typeof req.body?.image === "string" ? req.body.image.trim() : "";
    const image = uploadedImageUrl || fallbackImage;

    if (!image) {
      return fail(res, "Offer image is required", 400);
    }

    const priority = parseOptionalNumber(req.body?.priority) ?? 0;
    const isActive = parseOptionalBoolean(req.body?.isActive) ?? true;

    const offer = await Offer.create({
      title: String(req.body?.title || "").trim(),
      subtitle: String(req.body?.subtitle || "").trim(),
      cta: String(req.body?.cta || "").trim(),
      linkUrl: String(req.body?.linkUrl || "").trim(),
      image,
      priority,
      isActive,
    });

    recordAudit({
      actorId: getActorId(req),
      action: "create",
      resource: "offer",
      resourceId: offer._id.toString(),
      after: offer.toObject(),
    }).catch(() => {});

    return success(res, offer, "Offer created", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Create failed";
    return fail(res, message, 500);
  }
};

export const updateOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const before = await Offer.findById(id);
    if (!before) {
      return fail(res, "Offer not found", 404);
    }

    const uploadedImageUrl = await uploadOfferImage(req);

    const updatePayload: {
      title?: string;
      subtitle?: string;
      cta?: string;
      linkUrl?: string;
      priority?: number;
      isActive?: boolean;
      image?: string;
    } = {};

    if (req.body?.title !== undefined) updatePayload.title = String(req.body.title || "").trim();
    if (req.body?.subtitle !== undefined) updatePayload.subtitle = String(req.body.subtitle || "").trim();
    if (req.body?.cta !== undefined) updatePayload.cta = String(req.body.cta || "").trim();
    if (req.body?.linkUrl !== undefined) updatePayload.linkUrl = String(req.body.linkUrl || "").trim();

    const parsedPriority = parseOptionalNumber(req.body?.priority);
    if (parsedPriority !== undefined) updatePayload.priority = parsedPriority;

    const parsedIsActive = parseOptionalBoolean(req.body?.isActive);
    if (parsedIsActive !== undefined) updatePayload.isActive = parsedIsActive;

    if (uploadedImageUrl) {
      updatePayload.image = uploadedImageUrl;
    } else if (req.body?.image !== undefined) {
      updatePayload.image = String(req.body.image || "").trim();
    }

    const offer = await Offer.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!offer) {
      return fail(res, "Offer not found", 404);
    }

    if (uploadedImageUrl && before.image && before.image !== uploadedImageUrl) {
      deleteFromMinio(before.image).catch(() => {});
    }

    recordAudit({
      actorId: getActorId(req),
      action: "update",
      resource: "offer",
      resourceId: offer._id.toString(),
      before: before.toObject(),
      after: offer.toObject(),
    }).catch(() => {});

    return success(res, offer, "Offer updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    return fail(res, message, 500);
  }
};

export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      return fail(res, "Offer not found", 404);
    }

    if (offer.image) {
      deleteFromMinio(offer.image).catch(() => {});
    }

    recordAudit({
      actorId: getActorId(req),
      action: "delete",
      resource: "offer",
      resourceId: offer._id.toString(),
      before: offer.toObject(),
      after: { deleted: true },
    }).catch(() => {});

    return success(
      res,
      {
        deletedId: offer._id.toString(),
      },
      "Offer deleted"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return fail(res, message, 500);
  }
};
