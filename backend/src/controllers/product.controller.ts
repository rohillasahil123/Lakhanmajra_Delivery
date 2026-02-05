import { Request, Response } from "express";
import { Product } from "../models/product.model";

// ADMIN → Create Product
export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description, images, categoryId } = req.body;

    const product = await Product.create({
      name,
      description,
      images,
      categoryId,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER → Get Products (by category)
export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categoryId } = req.query;

    const filter: any = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;

    const products = await Product.find(filter);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER → Get Single Product
export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN → Activate / Deactivate Product
export const updateProductStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
