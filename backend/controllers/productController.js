import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import prisma from "../database/db.js";
import { getAIRecommendation } from "../utils/getAIRecommendation.js";

const PRICE_INPUT_DIVISOR = Number(process.env.PRICE_INPUT_DIVISOR || 283);
const activeProductWhere = {
  OR: [
    { creator: { role: { not: "Seller" } } },
    { creator: { seller_profile: { is: { status: { not: "Suspended" } } } } },
  ],
};

const productInclude = {
  creator: { select: { role: true, seller_profile: { select: { store_name: true } } } },
  _count: { select: { reviews: true } },
};

const attachSeller = ({ creator, _count, ...product }) => ({
  ...product,
  review_count: _count?.reviews || 0,
  seller: creator.role === "Seller"
    ? { id: product.created_by, name: creator.seller_profile?.store_name || "Unnamed Store" }
    : { id: null, name: "Shelf153" },
});

const parseProductInput = (body) => {
  const price = Number(body.price);
  const stock = Number(body.stock);
  if (![body.name, body.description, body.category].every((value) => typeof value === "string" && value.trim())) {
    throw new ErrorHandler("Please provide complete product details.", 400);
  }
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    throw new ErrorHandler("Price must be positive and stock must be a non-negative integer.", 400);
  }
  return {
    name: body.name.trim(), description: body.description.trim(), category: body.category.trim(),
    price: Math.round((price / PRICE_INPUT_DIVISOR) * 100) / 100, stock,
  };
};

export const createProduct = catchAsyncErrors(async (req, res, next) => {
  let input;
  try { input = parseProductInput(req.body); } catch (error) { return next(error); }

  const uploadedImages = [];
  if (req.files?.images) {
    const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_Images", width: 1000, crop: "scale",
      });
      uploadedImages.push({ url: result.secure_url, public_id: result.public_id });
    }
  }

  const product = await prisma.product.create({
    data: { ...input, images: uploadedImages, created_by: req.user.id },
  });
  res.status(201).json({ success: true, message: "Product created successfully.", product });
});

export const fetchAllProducts = catchAsyncErrors(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const where = { AND: [activeProductWhere] };
  if (req.query.availability === "in-stock") where.AND.push({ stock: { gt: 5 } });
  if (req.query.availability === "limited") where.AND.push({ stock: { gt: 0, lte: 5 } });
  if (req.query.availability === "out-of-stock") where.AND.push({ stock: 0 });
  if (req.query.price) {
    const [min, max] = req.query.price.split("-").map(Number);
    if (Number.isFinite(min) && Number.isFinite(max)) where.AND.push({ price: { gte: min, lte: max } });
  }
  if (req.query.category) where.AND.push({ category: { contains: req.query.category, mode: "insensitive" } });
  if (Number.isFinite(Number(req.query.ratings))) where.AND.push({ ratings: { gte: Number(req.query.ratings) } });
  if (req.query.search) where.AND.push({ OR: [
    { name: { contains: req.query.search, mode: "insensitive" } },
    { description: { contains: req.query.search, mode: "insensitive" } },
  ] });

  const [totalProducts, products, newProducts, topRatedProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: productInclude, orderBy: { created_at: "desc" }, take: 10, skip: (page - 1) * 10 }),
    prisma.product.findMany({
      where: { AND: [activeProductWhere, { created_at: { gte: new Date(Date.now() - 30 * 86400000) } }] },
      include: productInclude, orderBy: { created_at: "desc" }, take: 8,
    }),
    prisma.product.findMany({
      where: { AND: [activeProductWhere, { ratings: { gte: 4.5 } }] },
      include: productInclude, orderBy: [{ ratings: "desc" }, { created_at: "desc" }], take: 8,
    }),
  ]);
  res.status(200).json({
    success: true, products: products.map(attachSeller), totalProducts,
    newProducts: newProducts.map(attachSeller), topRatedProducts: topRatedProducts.map(attachSeller),
  });
});

export const updateProduct = catchAsyncErrors(async (req, res, next) => {
  let input;
  try { input = parseProductInput(req.body); } catch (error) { return next(error); }
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product) return next(new ErrorHandler("Product not found.", 404));
  if (req.user.role === "Seller" && product.created_by !== req.user.id) return next(new ErrorHandler("You can only manage your own products.", 403));
  const updatedProduct = await prisma.product.update({ where: { id: product.id }, data: input });
  res.status(200).json({ success: true, message: "Product updated successfully.", updatedProduct });
});

export const deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product) return next(new ErrorHandler("Product not found.", 404));
  if (req.user.role === "Seller" && product.created_by !== req.user.id) return next(new ErrorHandler("You can only manage your own products.", 403));
  const usedInOrder = await prisma.orderItem.findFirst({ where: { product_id: product.id }, select: { id: true } });
  if (usedInOrder) return next(new ErrorHandler("Ordered products must be archived instead of deleted.", 409));
  await prisma.product.delete({ where: { id: product.id } });
  for (const image of Array.isArray(product.images) ? product.images : []) await cloudinary.uploader.destroy(image.public_id);
  res.status(200).json({ success: true, message: "Product deleted successfully." });
});

export const fetchSingleProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await prisma.product.findFirst({
    where: { AND: [{ id: req.params.productId }, activeProductWhere] },
    include: {
      ...productInclude,
      reviews: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { created_at: "desc" } },
    },
  });
  if (!product) return next(new ErrorHandler("Product not found.", 404));
  const reviews = product.reviews.map(({ user, id, rating, comment, created_at }) => ({
    review_id: id, rating, comment, created_at,
    reviewer: { id: user.id, name: user.name, avatar: user.avatar },
  }));
  const { reviews: _reviews, ...withoutReviews } = product;
  res.status(200).json({ success: true, message: "Product fetched successfully.", product: { ...attachSeller(withoutReviews), reviews } });
});

const refreshRating = async (tx, productId) => {
  const aggregate = await tx.review.aggregate({ where: { product_id: productId }, _avg: { rating: true } });
  return tx.product.update({ where: { id: productId }, data: { ratings: aggregate._avg.rating || 0 } });
};

export const postProductReview = catchAsyncErrors(async (req, res, next) => {
  const rating = Number(req.body.rating);
  const comment = req.body.comment?.trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !comment) return next(new ErrorHandler("Rating must be between 1 and 5 and a comment is required.", 400));
  const product = await prisma.product.findUnique({ where: { id: req.params.productId }, select: { id: true } });
  if (!product) return next(new ErrorHandler("Product not found.", 404));
  const purchase = await prisma.orderItem.findFirst({
    where: { product_id: product.id, order: { buyer_id: req.user.id, paid_at: { not: null }, payment: { is: { payment_status: "Paid" } } } },
    select: { id: true },
  });
  if (!purchase) return next(new ErrorHandler("You can only review a product you've purchased.", 403));
  const { review, updatedProduct } = await prisma.$transaction(async (tx) => {
    const review = await tx.review.upsert({
      where: { product_id_user_id: { product_id: product.id, user_id: req.user.id } },
      create: { product_id: product.id, user_id: req.user.id, rating, comment },
      update: { rating, comment },
    });
    return { review, updatedProduct: await refreshRating(tx, product.id) };
  });
  res.status(200).json({ success: true, message: "Review posted.", review, product: updatedProduct });
});

export const deleteReview = catchAsyncErrors(async (req, res, next) => {
  const key = { product_id_user_id: { product_id: req.params.productId, user_id: req.user.id } };
  const existing = await prisma.review.findUnique({ where: key });
  if (!existing) return next(new ErrorHandler("Review not found.", 404));
  const updatedProduct = await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: key });
    return refreshRating(tx, req.params.productId);
  });
  res.status(200).json({ success: true, message: "Your review has been deleted.", review: existing, product: updatedProduct });
});

export const fetchAIFilteredProducts = catchAsyncErrors(async (req, res, next) => {
  const userPrompt = req.body.userPrompt?.trim();
  if (!userPrompt) return next(new ErrorHandler("Provide a valid prompt.", 400));
  const stopWords = new Set(["the", "they", "them", "then", "i", "we", "you", "he", "she", "it", "is", "a", "an", "of", "and", "or", "to", "for", "from", "on", "with", "this", "that", "in", "at", "by", "be"]);
  const keywords = userPrompt.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter((word) => word && !stopWords.has(word)).slice(0, 12);
  if (!keywords.length) return res.status(200).json({ success: true, message: "No products found.", products: [] });
  const filteredProducts = await prisma.product.findMany({
    where: { AND: [activeProductWhere, { OR: keywords.flatMap((keyword) => [
      { name: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
      { category: { contains: keyword, mode: "insensitive" } },
    ]) }] }, take: 200,
  });
  if (!filteredProducts.length) return res.status(200).json({ success: true, message: "No products found matching your prompt.", products: [] });
  const result = await getAIRecommendation(userPrompt, filteredProducts);
  res.status(200).json({ success: true, message: "AI filtered products.", products: result });
});
