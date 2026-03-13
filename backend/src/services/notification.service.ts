import { Request, Response } from "express";
import { Types } from "mongoose";
import { Notification } from "../models/notification.model";
import { NotificationReceipt } from "../models/notification-receipt.model";
import User from "../models/user.model";
import { sendExpoPushNotifications } from "./expo-push.service";
import { uploadToMinio, deleteFromMinio } from "./minio.service";
import { fail, success } from "../utils/response";

type ActorShape = { id?: string; _id?: string } | null | undefined;

const toObjectId = (value: string): Types.ObjectId | null => {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
};

const getActorId = (req: Request): string | undefined => {
  const actor = (req as Request & { user?: ActorShape }).user;
  if (actor?.id) return actor.id;
  if (actor?._id) return String(actor._id);
  return undefined;
};

const parseRecipients = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item || "").trim())
      .filter((item) => item.length > 0);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter((item) => item.length > 0);
      }
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const getPagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const asSingleParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
};

const uniqueTokensFromUsers = (users: Array<{ expoPushTokens?: string[] }>): string[] => {
  const tokenSet = new Set<string>();
  for (const user of users) {
    for (const token of user.expoPushTokens || []) {
      const trimmed = String(token || "").trim();
      if (trimmed) tokenSet.add(trimmed);
    }
  }
  return Array.from(tokenSet);
};

const gatherTokensByAudience = async (
  audience: "all" | "selected",
  recipients: Types.ObjectId[]
): Promise<string[]> => {
  if (audience === "selected") {
    if (!recipients.length) return [];
    const users = await User.find({ _id: { $in: recipients }, isActive: true })
      .select("expoPushTokens")
      .lean();
    return uniqueTokensFromUsers(users as Array<{ expoPushTokens?: string[] }>);
  }

  const users = await User.find({ isActive: true, expoPushTokens: { $exists: true, $ne: [] } })
    .select("expoPushTokens")
    .lean();
  return uniqueTokensFromUsers(users as Array<{ expoPushTokens?: string[] }>);
};

const cleanupInvalidTokens = async (invalidTokens: string[]) => {
  if (!invalidTokens.length) return;
  await User.updateMany(
    { expoPushTokens: { $in: invalidTokens } },
    { $pull: { expoPushTokens: { $in: invalidTokens } } }
  );
};

const parseRecipientObjectIds = (raw: unknown): Types.ObjectId[] => {
  return parseRecipients(raw)
    .map(toObjectId)
    .filter((item): item is Types.ObjectId => Boolean(item));
};

const applyNotificationPatchAudience = (
  patch: Record<string, unknown>,
  existingAudience: "all" | "selected",
  body: any
): { error?: string } => {
  if (body?.audience !== undefined) {
    const audience = String(body.audience) === "selected" ? "selected" : "all";
    const recipientObjectIds = parseRecipientObjectIds(body?.recipientIds);

    if (audience === "selected" && recipientObjectIds.length === 0) {
      return { error: "Please select at least one user" };
    }

    patch.audience = audience;
    patch.recipients = audience === "selected" ? recipientObjectIds : [];
    return {};
  }

  if (body?.recipientIds !== undefined) {
    const recipientObjectIds = parseRecipientObjectIds(body?.recipientIds);

    if (existingAudience === "selected" && recipientObjectIds.length === 0) {
      return { error: "Please select at least one user" };
    }

    patch.recipients = existingAudience === "selected" ? recipientObjectIds : [];
  }

  return {};
};

const uploadNotificationImage = async (req: Request): Promise<string | undefined> => {
  const file = req.file;
  if (!file) return undefined;
  return uploadToMinio(file.buffer, file.originalname, file.mimetype, "notifications");
};

export const listAdminNotifications = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const filter: any = {};

    if (req.query.active === "true") filter.isActive = true;
    if (req.query.active === "false") filter.isActive = false;

    const [rows, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("recipients", "name email phone")
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return success(
      res,
      {
        data: rows,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
      "Notifications fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fetch failed";
    return fail(res, message, 500);
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const uploadedImageUrl = await uploadNotificationImage(req);
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    const linkUrl = String(req.body?.linkUrl || "").trim();
    const fallbackImageUrl = String(req.body?.imageUrl || "").trim();
    const imageUrl = uploadedImageUrl || fallbackImageUrl;
    const audience = String(req.body?.audience || "all").trim() === "selected" ? "selected" : "all";
    const recipientIds = parseRecipients(req.body?.recipientIds);

    if (!title) return fail(res, "Title is required", 400);
    if (!body) return fail(res, "Body is required", 400);

    const recipientObjectIds = recipientIds
      .map(toObjectId)
      .filter((item): item is Types.ObjectId => Boolean(item));

    if (audience === "selected" && recipientObjectIds.length === 0) {
      return fail(res, "Please select at least one user", 400);
    }

    const notification = await Notification.create({
      title,
      body,
      linkUrl,
      imageUrl,
      audience,
      recipients: audience === "selected" ? recipientObjectIds : [],
      isActive: true,
      createdBy: getActorId(req),
    });

    const tokens = await gatherTokensByAudience(audience, notification.recipients || []);
    const pushResult = await sendExpoPushNotifications(tokens, title, body, {
      notificationId: String(notification._id),
      linkUrl,
      imageUrl,
      audience,
    }, imageUrl);
    await cleanupInvalidTokens(pushResult.invalidTokens);

    return success(
      res,
      {
        notification,
        push: pushResult,
      },
      "Notification sent",
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Create failed";
    return fail(res, message, 500);
  }
};

export const registerDeviceToken = async (req: Request, res: Response) => {
  try {
    const actorId = getActorId(req);
    if (!actorId || !Types.ObjectId.isValid(actorId)) return fail(res, "Unauthorized", 401);

    const expoPushToken = String(req.body?.expoPushToken || "").trim();
    if (!expoPushToken) return fail(res, "expoPushToken is required", 400);

    if (!/^ExponentPushToken\[[^\]]+\]$/.test(expoPushToken) && !/^ExpoPushToken\[[^\]]+\]$/.test(expoPushToken)) {
      return fail(res, "Invalid Expo push token", 400);
    }

    const updated = await User.findByIdAndUpdate(
      actorId,
      { $addToSet: { expoPushTokens: expoPushToken } },
      { new: true }
    ).select("_id expoPushTokens");

    if (!updated) return fail(res, "User not found", 404);

    return success(res, { expoPushTokens: updated.expoPushTokens || [] }, "Device token saved");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Save failed";
    return fail(res, message, 500);
  }
};

export const unregisterDeviceToken = async (req: Request, res: Response) => {
  try {
    const actorId = getActorId(req);
    if (!actorId || !Types.ObjectId.isValid(actorId)) return fail(res, "Unauthorized", 401);

    const expoPushToken = String(req.body?.expoPushToken || "").trim();
    if (!expoPushToken) return fail(res, "expoPushToken is required", 400);

    const updated = await User.findByIdAndUpdate(
      actorId,
      { $pull: { expoPushTokens: expoPushToken } },
      { new: true }
    ).select("_id expoPushTokens");

    if (!updated) return fail(res, "User not found", 404);

    return success(res, { expoPushTokens: updated.expoPushTokens || [] }, "Device token removed");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Remove failed";
    return fail(res, message, 500);
  }
};

export const updateNotification = async (req: Request, res: Response) => {
  try {
    const id = asSingleParam(req.params.id);
    if (!Types.ObjectId.isValid(id)) return fail(res, "Invalid id", 400);

    const existing = await Notification.findById(id);
    if (!existing) return fail(res, "Notification not found", 404);
    const uploadedImageUrl = await uploadNotificationImage(req);

    const patch: any = {};

    if (req.body?.title !== undefined) patch.title = String(req.body.title || "").trim();
    if (req.body?.body !== undefined) patch.body = String(req.body.body || "").trim();
    if (req.body?.linkUrl !== undefined) patch.linkUrl = String(req.body.linkUrl || "").trim();
    if (uploadedImageUrl) {
      patch.imageUrl = uploadedImageUrl;
    } else if (req.body?.imageUrl !== undefined) {
      patch.imageUrl = String(req.body.imageUrl || "").trim();
    }
    if (req.body?.isActive !== undefined) patch.isActive = String(req.body.isActive) === "true" || req.body.isActive === true;

    const audiencePatch = applyNotificationPatchAudience(patch, existing.audience, req.body);
    if (audiencePatch.error) {
      return fail(res, audiencePatch.error, 400);
    }

    const updated = await Notification.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return fail(res, "Notification not found", 404);

    if (uploadedImageUrl && existing.imageUrl && existing.imageUrl !== uploadedImageUrl) {
      deleteFromMinio(existing.imageUrl).catch(() => {});
    }

    return success(res, updated, "Notification updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    return fail(res, message, 500);
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const id = asSingleParam(req.params.id);
    if (!Types.ObjectId.isValid(id)) return fail(res, "Invalid id", 400);

    const deleted = await Notification.findByIdAndDelete(id);
    if (!deleted) return fail(res, "Notification not found", 404);

    if (deleted.imageUrl) {
      deleteFromMinio(deleted.imageUrl).catch(() => {});
    }

    await NotificationReceipt.deleteMany({ notificationId: deleted._id });

    return success(res, { deletedId: deleted._id }, "Notification deleted");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return fail(res, message, 500);
  }
};

export const listMyNotifications = async (req: Request, res: Response) => {
  try {
    const actorId = getActorId(req);
    if (!actorId || !Types.ObjectId.isValid(actorId)) return fail(res, "Unauthorized", 401);

    const userId = new Types.ObjectId(actorId);
    const { page, limit, skip } = getPagination(req);
    const statusQuery = req.query.status;
    const status = typeof statusQuery === "string" ? statusQuery : "all";

    const match: any = {
      isActive: true,
      $or: [{ audience: "all" }, { audience: "selected", recipients: userId }],
    };

    const unreadOnly = status === "unread";

    const rows = await Notification.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "notificationreceipts",
          let: { nId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$notificationId", "$$nId"] },
                    { $eq: ["$userId", userId] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "receipt",
        },
      },
      {
        $addFields: {
          isRead: {
            $cond: [
              { $gt: [{ $size: "$receipt" }, 0] },
              { $arrayElemAt: ["$receipt.isRead", 0] },
              false,
            ],
          },
          readAt: {
            $cond: [
              { $gt: [{ $size: "$receipt" }, 0] },
              { $arrayElemAt: ["$receipt.readAt", 0] },
              null,
            ],
          },
        },
      },
      ...(unreadOnly ? [{ $match: { isRead: false } }] : []),
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalRows: [{ $count: "count" }],
          unreadRows: [{ $match: { isRead: false } }, { $count: "count" }],
        },
      },
    ]);

    const payload = rows[0] || { data: [], totalRows: [], unreadRows: [] };
    const total = payload.totalRows?.[0]?.count || 0;
    const unreadCount = payload.unreadRows?.[0]?.count || 0;

    return success(
      res,
      {
        data: payload.data || [],
        total,
        unreadCount,
        page,
        limit,
        hasMore: page * limit < total,
      },
      "Notifications fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fetch failed";
    return fail(res, message, 500);
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const actorId = getActorId(req);
    if (!actorId || !Types.ObjectId.isValid(actorId)) return fail(res, "Unauthorized", 401);

    const notificationId = asSingleParam(req.params.id);
    if (!Types.ObjectId.isValid(notificationId)) return fail(res, "Invalid id", 400);

    const userId = new Types.ObjectId(actorId);
    const nId = new Types.ObjectId(notificationId);

    const allowed = await Notification.exists({
      _id: nId,
      isActive: true,
      $or: [{ audience: "all" }, { audience: "selected", recipients: userId }],
    });

    if (!allowed) return fail(res, "Notification not found", 404);

    const updated = await NotificationReceipt.findOneAndUpdate(
      { notificationId: nId, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return success(res, updated, "Marked as read");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    return fail(res, message, 500);
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const actorId = getActorId(req);
    if (!actorId || !Types.ObjectId.isValid(actorId)) return fail(res, "Unauthorized", 401);

    const userId = new Types.ObjectId(actorId);

    const myNotificationIds = await Notification.find({
      isActive: true,
      $or: [{ audience: "all" }, { audience: "selected", recipients: userId }],
    })
      .select("_id")
      .lean();

    if (!myNotificationIds.length) {
      return success(res, { updated: 0 }, "No notifications to mark");
    }

    const now = new Date();

    const operations = myNotificationIds.map((row) => ({
      updateOne: {
        filter: { notificationId: row._id, userId },
        update: { $set: { isRead: true, readAt: now } },
        upsert: true,
      },
    }));

    const bulkResult = await NotificationReceipt.bulkWrite(operations, { ordered: false });
    const updated = (bulkResult.modifiedCount || 0) + (bulkResult.upsertedCount || 0);

    return success(res, { updated }, "All notifications marked as read");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    return fail(res, message, 500);
  }
};
