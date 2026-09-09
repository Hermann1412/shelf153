import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import prisma from "../database/db.js";

const SETTINGS_ID = "singleton";

export const getSiteSettings = catchAsyncErrors(async (req, res) => {
  const settings = await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
  res.status(200).json({ success: true, settings });
});

export const updateSiteSettings = catchAsyncErrors(async (req, res) => {
  const { contact_email, contact_phone, address } = req.body;
  const settings = await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { contact_email, contact_phone, address },
    create: { id: SETTINGS_ID, contact_email, contact_phone, address },
  });
  res.status(200).json({ success: true, message: "Settings updated.", settings });
});
