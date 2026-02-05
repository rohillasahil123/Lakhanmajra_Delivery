import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().allow("").optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  categoryId: Joi.string().required(),
  subcategoryId: Joi.string().optional().allow(null, ""),
  price: Joi.number().min(0).required(),
  mrp: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().allow("").optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  categoryId: Joi.string().optional(),
  subcategoryId: Joi.string().optional().allow(null, ""),
  price: Joi.number().min(0).optional(),
  mrp: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
});
