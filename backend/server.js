import { createServer } from "http";
import app from "./app.js";
import { v2 as cloudinary } from "cloudinary";
import { initSocket } from "./socket/socketHandler.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRET,
});

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
