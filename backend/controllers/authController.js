import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";
import bcrypt from "bcrypt";
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateEmailTemplate } from "../utils/generateForgotPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { toPublicUser } from "../utils/publicUser.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, password } = req.body;
  const email = req.body.email?.trim().toLowerCase();
  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide all required fields.", 400));
  }
  if (password.length < 8 || password.length > 16) {
    return next(
      new ErrorHandler("Password must be between 8 and 16 characters.", 400)
    );
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return next(new ErrorHandler("User already registered with this email.", 400));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email, password: hashedPassword },
  });
  sendToken(user, 201, "User registered successfully", res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { password } = req.body;
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !password) {
    return next(new ErrorHandler("Please provide email and password.", 400));
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return next(new ErrorHandler("Invalid email or password.", 401));
  }
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid email or password.", 401));
  }
  sendToken(user, 200, "Logged In.", res);
});

export const getUser = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, user: toPublicUser(req.user) });
});

export const logout = catchAsyncErrors(async (req, res) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    })
    .json({ success: true, message: "Logged out successfully." });
});

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email) return next(new ErrorHandler("Please provide an email address.", 400));
  const user = await prisma.user.findUnique({ where: { email } });
  const genericMessage = "If an account exists, a password reset email has been sent.";
  if (!user) return res.status(200).json({ success: true, message: genericMessage });
  const { hashedToken, resetPasswordExpireTime, resetToken } =
    generateResetPasswordToken();

  await prisma.user.update({
    where: { email },
    data: { reset_password_token: hashedToken, reset_password_expire: new Date(resetPasswordExpireTime) },
  });

  const allowedOrigins = [process.env.FRONTEND_URL, process.env.DASHBOARD_URL].filter(Boolean);
  const origin = allowedOrigins.includes(req.get("origin")) ? req.get("origin") : process.env.FRONTEND_URL;
  const resetPasswordUrl = `${origin}/password/reset/${resetToken}`;
  const message = generateEmailTemplate(resetPasswordUrl);

  try {
    await sendEmail({ email: user.email, subject: "Ecommerce Password Recovery", message });
    res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch {
    await prisma.user.update({
      where: { email },
      data: { reset_password_token: null, reset_password_expire: null },
    });
    return next(new ErrorHandler("Email could not be sent.", 500));
  }
});

export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: { reset_password_token: resetPasswordToken, reset_password_expire: { gt: new Date() } },
  });
  if (!user) {
    return next(new ErrorHandler("Invalid or expired reset token.", 400));
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Passwords do not match.", 400));
  }
  if (
    req.body.password?.length < 8 ||
    req.body.password?.length > 16 ||
    req.body.confirmPassword?.length < 8 ||
    req.body.confirmPassword?.length > 16
  ) {
    return next(new ErrorHandler("Password must be between 8 and 16 characters.", 400));
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, reset_password_token: null, reset_password_expire: null },
  });
  sendToken(updated, 200, "Password reset successfully", res);
});

export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return next(new ErrorHandler("Please provide all required fields.", 400));
  }
  const isPasswordMatch = await bcrypt.compare(currentPassword, req.user.password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Current password is incorrect.", 401));
  }
  if (newPassword !== confirmNewPassword) {
    return next(new ErrorHandler("New passwords do not match.", 400));
  }
  if (
    newPassword.length < 8 ||
    newPassword.length > 16 ||
    confirmNewPassword.length < 8 ||
    confirmNewPassword.length > 16
  ) {
    return next(new ErrorHandler("Password must be between 8 and 16 characters.", 400));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashedPassword } });

  res.status(200).json({ success: true, message: "Password updated successfully." });
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return next(new ErrorHandler("Please provide all required fields.", 400));
  }
  if (!name.trim() || !email.trim()) {
    return next(new ErrorHandler("Name and email cannot be empty.", 400));
  }

  let avatarData = null;
  if (req.files && req.files.avatar) {
    const { avatar } = req.files;
    if (req.user?.avatar?.public_id) {
      await cloudinary.uploader.destroy(req.user.avatar.public_id);
    }
    const newProfileImage = await cloudinary.uploader.upload(avatar.tempFilePath, {
      folder: "Ecommerce_Avatars",
      width: 150,
      crop: "scale",
    });
    avatarData = { public_id: newProfileImage.public_id, url: newProfileImage.secure_url };
  }

  if (avatarData) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim(), email: email.trim().toLowerCase(), avatar: avatarData },
    });
  } else {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim(), email: email.trim().toLowerCase() },
    });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user: toPublicUser(user),
  });
});
