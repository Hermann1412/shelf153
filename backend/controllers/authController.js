import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt from "bcrypt";
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateEmailTemplate } from "../utils/generateForgotPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";

export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide all required fields.", 400));
  }
  if (password.length < 8 || password.length > 16) {
    return next(
      new ErrorHandler("Password must be between 8 and 16 characters.", 400)
    );
  }

  const existing = await database.query(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );
  if (existing.rows.length > 0) {
    return next(new ErrorHandler("User already registered with this email.", 400));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = uuidv4();

  await database.query(
    "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
    [id, name, email, hashedPassword]
  );

  const { rows } = await database.query("SELECT * FROM users WHERE id = ?", [id]);
  sendToken(rows[0], 201, "User registered successfully", res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please provide email and password.", 400));
  }
  const { rows } = await database.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  if (rows.length === 0) {
    return next(new ErrorHandler("Invalid email or password.", 401));
  }
  const isPasswordMatch = await bcrypt.compare(password, rows[0].password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid email or password.", 401));
  }
  sendToken(rows[0], 200, "Logged In.", res);
});

export const getUser = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export const logout = catchAsyncErrors(async (req, res) => {
  res
    .status(200)
    .cookie("token", "", { expires: new Date(Date.now()), httpOnly: true })
    .json({ success: true, message: "Logged out successfully." });
});

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  const { frontendUrl } = req.query;

  const { rows } = await database.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  if (rows.length === 0) {
    return next(new ErrorHandler("User not found with this email.", 404));
  }
  const user = rows[0];
  const { hashedToken, resetPasswordExpireTime, resetToken } =
    generateResetPasswordToken();

  await database.query(
    "UPDATE users SET reset_password_token = ?, reset_password_expire = FROM_UNIXTIME(?) WHERE email = ?",
    [hashedToken, resetPasswordExpireTime / 1000, email]
  );

  const resetPasswordUrl = `${frontendUrl}/password/reset/${resetToken}`;
  const message = generateEmailTemplate(resetPasswordUrl);

  try {
    await sendEmail({ email: user.email, subject: "Ecommerce Password Recovery", message });
    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully.`,
    });
  } catch {
    await database.query(
      "UPDATE users SET reset_password_token = NULL, reset_password_expire = NULL WHERE email = ?",
      [email]
    );
    return next(new ErrorHandler("Email could not be sent.", 500));
  }
});

export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

  const { rows } = await database.query(
    "SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expire > NOW()",
    [resetPasswordToken]
  );
  if (rows.length === 0) {
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
  const userId = rows[0].id;

  await database.query(
    "UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expire = NULL WHERE id = ?",
    [hashedPassword, userId]
  );

  const { rows: updated } = await database.query("SELECT * FROM users WHERE id = ?", [userId]);
  sendToken(updated[0], 200, "Password reset successfully", res);
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
  await database.query("UPDATE users SET password = ? WHERE id = ?", [
    hashedPassword,
    req.user.id,
  ]);

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
    await database.query(
      "UPDATE users SET name = ?, email = ?, avatar = ? WHERE id = ?",
      [name, email, JSON.stringify(avatarData), req.user.id]
    );
  } else {
    await database.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, req.user.id]
    );
  }

  const { rows } = await database.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user: rows[0],
  });
});
