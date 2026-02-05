import { Request, Response } from "express";
import { Category } from "../models/category.model";

// ADMIN → Create category
export const createCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, icon, priority } = req.body;

    const category = await Category.create({
      name,
      icon,
      priority,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER → Get active categories
export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      priority: 1,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
