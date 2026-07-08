import jwt from "jsonwebtoken";
import { catchAsyncErrors } from "./catchAsyncError.js";
import ErrorHandler from "./errorMiddleware.js";
import database from "../database/db.js";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to access this resource.", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await database.query(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [decoded.id]
  );
  req.user = user.rows[0];

  if (req.user?.role === "Seller") {
    const { rows: profileRows } = await database.query(
      "SELECT status FROM seller_profiles WHERE user_id = ?",
      [req.user.id]
    );
    if (profileRows[0]?.status === "Suspended") {
      return next(new ErrorHandler("Your seller account has been suspended.", 403));
    }
  }

  next();
});

export const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resource.`,
          403
        )
      );
    }
    next();
  };
};
