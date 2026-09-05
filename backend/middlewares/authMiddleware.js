import jwt from "jsonwebtoken";
import { catchAsyncErrors } from "./catchAsyncError.js";
import ErrorHandler from "./errorMiddleware.js";
import prisma from "../database/db.js";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to access this resource.", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!req.user) {
    return next(new ErrorHandler("The user for this session no longer exists.", 401));
  }

  if (req.user?.role === "Seller") {
    const profile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.id },
      select: { status: true },
    });
    if (profile?.status === "Suspended") {
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
