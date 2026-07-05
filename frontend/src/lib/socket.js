import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.MODE === "development" ? "http://localhost:4000" : "/";

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
});
