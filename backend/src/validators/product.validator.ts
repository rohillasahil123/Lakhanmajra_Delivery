import Joi from "joi";
import { Types } from "mongoose";

// Custom validation for MongoDB ObjectId
const objectId = Joi.string().custom((value, helpers) => {
  if (!Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
}, "ObjectId validation");

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().allow("").optional(),
  // Images can be empty strings, URLs, or array of URLs (files are handled separately in controller)
  images: Joi.alternatives().try(
    Joi.array().items(Joi.string()).optional(),
    Joi.string().allow("").optional()
  ).optional(),
  categoryId: objectId.required(),
  subcategoryId: objectId.optional().allow(null, ""),
  price: Joi.number().min(0).required(),
  mrp: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()).optional(),
    Joi.string().allow("").optional()
  ).optional(),
}).unknown(true); // Allow unknown fields like file uploads

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().allow("").optional(),
  images: Joi.alternatives().try(
    Joi.array().items(Joi.string()).optional(),
    Joi.string().allow("").optional()
  ).optional(),
  categoryId: objectId.optional(),
  subcategoryId: objectId.optional().allow(null, ""),
  price: Joi.number().min(0).optional(),
  mrp: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()).optional(),
    Joi.string().allow("").optional()
  ).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true); // Allow unknown fields like file uploads
