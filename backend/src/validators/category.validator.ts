import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  icon: Joi.string().uri().optional().allow(""),
  priority: Joi.number().integer().min(0).optional(),
  parentCategory: Joi.string().optional().allow(null, ""),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  icon: Joi.string().uri().optional().allow(""),
  priority: Joi.number().integer().min(0).optional(),
  parentCategory: Joi.string().optional().allow(null, ""),
  isActive: Joi.boolean().optional(),
});
