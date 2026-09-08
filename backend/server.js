import { createServer } from "http";
import app from "./app.js";
import { v2 as cloudinary } from "cloudinary";
import { initSocket } from "./socket/socketHandler.js";
import prisma from "./database/db.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRET,
});

const httpServer = createServer(app);
initSocket(httpServer);

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down.`);
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
