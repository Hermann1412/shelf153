import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import database from "../database/db.js";
import { getAIRecommendation } from "../utils/getAIRecommendation.js";
import { v4 as uuidv4 } from "uuid";

export const createProduct = catchAsyncErrors(async (req, res, next) => {
  const { name, description, price, category, stock } = req.body;
  const created_by = req.user.id;

  if (!name || !description || !price || !category || !stock) {
    return next(new ErrorHandler("Please provide complete product details.", 400));
  }

  let uploadedImages = [];
  if (req.files && req.files.images) {
    const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_Images",
        width: 1000,
        crop: "scale",
      });
      uploadedImages.push({ url: result.secure_url, public_id: result.public_id });
    }
  }

  const id = uuidv4();
  await database.query(
    "INSERT INTO products (id, name, description, price, category, stock, images, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, name, description, price / 283, category, stock, JSON.stringify(uploadedImages), created_by]
  );

  const { rows } = await database.query("SELECT * FROM products WHERE id = ?", [id]);
  res.status(201).json({ success: true, message: "Product created successfully.", product: rows[0] });
});

const SELLER_JOIN = `
     JOIN users u ON u.id = p.created_by
     LEFT JOIN seller_profiles sp ON sp.user_id = p.created_by`;
const SELLER_NOT_SUSPENDED = "(sp.status IS NULL OR sp.status != 'Suspended')";

const attachSeller = (row) => {
  const { owner_role, store_name, ...product } = row;
  return {
    ...product,
    seller:
      owner_role === "Seller"
        ? { id: product.created_by, name: store_name || "Unnamed Store" }
        : { id: null, name: "Shelf153" },
  };
};

export const fetchAllProducts = catchAsyncErrors(async (req, res) => {
  const { availability, price, category, ratings, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const conditions = [SELLER_NOT_SUSPENDED];
  const values = [];

  if (availability === "in-stock") conditions.push("stock > 5");
  else if (availability === "limited") conditions.push("stock > 0 AND stock <= 5");
  else if (availability === "out-of-stock") conditions.push("stock = 0");

  if (price) {
    const [minPrice, maxPrice] = price.split("-");
    if (minPrice && maxPrice) {
      conditions.push("price BETWEEN ? AND ?");
      values.push(minPrice, maxPrice);
    }
  }

  if (category) {
    conditions.push("category LIKE ?");
    values.push(`%${category}%`);
  }

  if (ratings) {
    conditions.push("ratings >= ?");
    values.push(ratings);
  }

  if (search) {
    conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
    values.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const { rows: countRows } = await database.query(
    `SELECT COUNT(*) AS count FROM products p ${SELLER_JOIN} ${whereClause}`,
    values
  );
  const totalProducts = parseInt(countRows[0].count);

  const { rows: products } = await database.query(
    `SELECT p.*, u.role AS owner_role, sp.store_name, COUNT(r.id) AS review_count
     FROM products p
     ${SELLER_JOIN}
     LEFT JOIN reviews r ON p.id = r.product_id
     ${whereClause}
     GROUP BY p.id, u.role, sp.store_name
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const { rows: newProducts } = await database.query(
    `SELECT p.*, u.role AS owner_role, sp.store_name, COUNT(r.id) AS review_count
     FROM products p
     ${SELLER_JOIN}
     LEFT JOIN reviews r ON p.id = r.product_id
     WHERE p.created_at >= NOW() - INTERVAL 30 DAY AND ${SELLER_NOT_SUSPENDED}
     GROUP BY p.id, u.role, sp.store_name
     ORDER BY p.created_at DESC
     LIMIT 8`
  );

  const { rows: topRatedProducts } = await database.query(
    `SELECT p.*, u.role AS owner_role, sp.store_name, COUNT(r.id) AS review_count
     FROM products p
     ${SELLER_JOIN}
     LEFT JOIN reviews r ON p.id = r.product_id
     WHERE p.ratings >= 4.5 AND ${SELLER_NOT_SUSPENDED}
     GROUP BY p.id, u.role, sp.store_name
     ORDER BY p.ratings DESC, p.created_at DESC
     LIMIT 8`
  );

  res.status(200).json({
    success: true,
    products: products.map(attachSeller),
    totalProducts,
    newProducts: newProducts.map(attachSeller),
    topRatedProducts: topRatedProducts.map(attachSeller),
  });
});

export const updateProduct = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { name, description, price, category, stock } = req.body;

  if (!name || !description || !price || !category || !stock) {
    return next(new ErrorHandler("Please provide complete product details.", 400));
  }

  const { rows } = await database.query("SELECT * FROM products WHERE id = ?", [productId]);
  if (rows.length === 0) return next(new ErrorHandler("Product not found.", 404));
  if (req.user.role === "Seller" && rows[0].created_by !== req.user.id) {
    return next(new ErrorHandler("You can only manage your own products.", 403));
  }

  await database.query(
    "UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ? WHERE id = ?",
    [name, description, price / 283, category, stock, productId]
  );

  const { rows: updated } = await database.query("SELECT * FROM products WHERE id = ?", [productId]);
  res.status(200).json({ success: true, message: "Product updated successfully.", updatedProduct: updated[0] });
});

export const deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  const { rows } = await database.query("SELECT * FROM products WHERE id = ?", [productId]);
  if (rows.length === 0) return next(new ErrorHandler("Product not found.", 404));
  if (req.user.role === "Seller" && rows[0].created_by !== req.user.id) {
    return next(new ErrorHandler("You can only manage your own products.", 403));
  }

  const images = rows[0].images;
  await database.query("DELETE FROM products WHERE id = ?", [productId]);

  if (images && images.length > 0) {
    for (const image of images) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }

  res.status(200).json({ success: true, message: "Product deleted successfully." });
});

export const fetchSingleProduct = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  const { rows: productRows } = await database.query(
    `SELECT p.*, ou.role AS owner_role, sp.store_name
     FROM products p
     JOIN users ou ON ou.id = p.created_by
     LEFT JOIN seller_profiles sp ON sp.user_id = p.created_by
     WHERE p.id = ? AND ${SELLER_NOT_SUSPENDED}`,
    [productId]
  );
  if (!productRows[0]) return next(new ErrorHandler("Product not found.", 404));

  const { rows: reviewRows } = await database.query(
    `SELECT r.id, r.rating, r.comment,
            u.id AS reviewer_id, u.name AS reviewer_name, u.avatar AS reviewer_avatar
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ?`,
    [productId]
  );

  const reviews = reviewRows.map((r) => ({
    review_id: r.id,
    rating: r.rating,
    comment: r.comment,
    reviewer: { id: r.reviewer_id, name: r.reviewer_name, avatar: r.reviewer_avatar },
  }));

  res.status(200).json({
    success: true,
    message: "Product fetched successfully.",
    product: { ...attachSeller(productRows[0]), reviews },
  });
});

export const postProductReview = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return next(new ErrorHandler("Please provide rating and comment.", 400));
  }

  const { rows: purchaseRows } = await database.query(
    `SELECT oi.product_id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN payments p ON p.order_id = o.id
     WHERE o.buyer_id = ? AND oi.product_id = ? AND p.payment_status = 'Paid'
     LIMIT 1`,
    [req.user.id, productId]
  );
  if (purchaseRows.length === 0) {
    return res.status(403).json({ success: false, message: "You can only review a product you've purchased." });
  }

  const { rows: productRows } = await database.query(
    "SELECT * FROM products WHERE id = ?",
    [productId]
  );
  if (productRows.length === 0) return next(new ErrorHandler("Product not found.", 404));

  const { rows: existing } = await database.query(
    "SELECT * FROM reviews WHERE product_id = ? AND user_id = ?",
    [productId, req.user.id]
  );

  let reviewId;
  if (existing.length > 0) {
    reviewId = existing[0].id;
    await database.query(
      "UPDATE reviews SET rating = ?, comment = ? WHERE product_id = ? AND user_id = ?",
      [rating, comment, productId, req.user.id]
    );
  } else {
    reviewId = uuidv4();
    await database.query(
      "INSERT INTO reviews (id, product_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
      [reviewId, productId, req.user.id, rating, comment]
    );
  }

  const { rows: avgRows } = await database.query(
    "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = ?",
    [productId]
  );
  const newAvgRating = avgRows[0].avg_rating;

  await database.query("UPDATE products SET ratings = ? WHERE id = ?", [newAvgRating, productId]);

  const { rows: reviewResult } = await database.query("SELECT * FROM reviews WHERE id = ?", [reviewId]);
  const { rows: updatedProduct } = await database.query("SELECT * FROM products WHERE id = ?", [productId]);

  res.status(200).json({
    success: true,
    message: "Review posted.",
    review: reviewResult[0],
    product: updatedProduct[0],
  });
});

export const deleteReview = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  const { rows: existing } = await database.query(
    "SELECT * FROM reviews WHERE product_id = ? AND user_id = ?",
    [productId, req.user.id]
  );
  if (existing.length === 0) return next(new ErrorHandler("Review not found.", 404));

  await database.query("DELETE FROM reviews WHERE product_id = ? AND user_id = ?", [
    productId,
    req.user.id,
  ]);

  const { rows: avgRows } = await database.query(
    "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = ?",
    [productId]
  );
  const newAvgRating = avgRows[0].avg_rating;

  await database.query("UPDATE products SET ratings = ? WHERE id = ?", [newAvgRating, productId]);
  const { rows: updatedProduct } = await database.query("SELECT * FROM products WHERE id = ?", [productId]);

  res.status(200).json({
    success: true,
    message: "Your review has been deleted.",
    review: existing[0],
    product: updatedProduct[0],
  });
});

export const fetchAIFilteredProducts = catchAsyncErrors(async (req, res, next) => {
  const { userPrompt } = req.body;
  if (!userPrompt) return next(new ErrorHandler("Provide a valid prompt.", 400));

  const filterKeywords = (query) => {
    const stopWords = new Set([
      "the","they","them","then","I","we","you","he","she","it","is","a","an","of",
      "and","or","to","for","from","on","who","whom","why","when","which","with","this",
      "that","in","at","by","be","not","was","were","has","have","had","do","does","did",
      "so","some","any","how","can","could","should","would","there","here","just","than",
      "because","but","its","it's","if",".",",","!","?",">","<",";","`",
      "1","2","3","4","5","6","7","8","9","10",
    ]);
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => !stopWords.has(word))
      .map((word) => `%${word}%`);
  };

  const keywords = filterKeywords(userPrompt);
  if (keywords.length === 0) {
    return res.status(200).json({ success: true, message: "No products found.", products: [] });
  }

  const conditions = keywords.flatMap(() => ["name LIKE ?", "description LIKE ?", "category LIKE ?"]);
  const values = keywords.flatMap((k) => [k, k, k]);

  const { rows: filteredProducts } = await database.query(
    `SELECT * FROM products WHERE ${conditions.join(" OR ")} LIMIT 200`,
    values
  );

  if (filteredProducts.length === 0) {
    return res.status(200).json({ success: true, message: "No products found matching your prompt.", products: [] });
  }

  const { success, products } = await getAIRecommendation(req, res, userPrompt, filteredProducts);
  res.status(200).json({ success, message: "AI filtered products.", products });
});
