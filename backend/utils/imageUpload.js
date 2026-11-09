import { open } from "node:fs/promises";
import ErrorHandler from "../middlewares/errorMiddleware.js";

// Uploaded files must really be JPEG, PNG or WebP images. The browser-supplied type can be
// faked, so the file's first bytes are checked as well.
const SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

const readHeader = async (path) => {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);
    return buffer;
  } finally {
    await handle.close();
  }
};

export const assertImageFile = async (file) => {
  const header = await readHeader(file.tempFilePath);
  const matchesType = SIGNATURES[file.mimetype]?.(header);
  if (!matchesType) {
    throw new ErrorHandler("Only JPEG, PNG or WebP images are accepted.", 400);
  }
};

// express-fileupload gives one file object or an array for repeated fields.
export const asFileList = (value) => (value ? (Array.isArray(value) ? value : [value]) : []);
