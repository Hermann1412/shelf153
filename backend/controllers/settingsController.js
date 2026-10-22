import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";

const SETTINGS_ID = "singleton";

export const getSiteSettings = catchAsyncErrors(async (req, res) => {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  res.status(200).json({
    success: true,
    settings: settings || { id: SETTINGS_ID, contact_email: null, contact_phone: null, address: null },
  });
});

const optionalText = (value, field, maxLength) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ErrorHandler(`${field} must be text.`, 400);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new ErrorHandler(`${field} is too long.`, 400);
  return normalized || null;
};

export const updateSiteSettings = catchAsyncErrors(async (req, res, next) => {
  const { contact_email, contact_phone, address } = req.body;
  let data;
  try {
    data = {
      contact_email: optionalText(contact_email, "Contact email", 150),
      contact_phone: optionalText(contact_phone, "Contact phone", 20),
      address: optionalText(address, "Address", 500),
    };
  } catch (error) {
    return next(error);
  }
  if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
    return next(new ErrorHandler("Contact email is invalid.", 400));
  }
  if (data.contact_phone && !/^\+?[\d\s().-]{7,20}$/.test(data.contact_phone)) {
    return next(new ErrorHandler("Contact phone is invalid.", 400));
  }
  const settings = await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });
  res.status(200).json({ success: true, message: "Settings updated.", settings });
});
