import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';

import userRoutes from './routes/userRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import uploadRoutes from "./routes/uploadRoutes.js";
import chatUploadRoutes from "./routes/chatUploadRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

import Chat from './models/Chat.js';

const app = express();

// --- Security / parsers
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(morgan('dev'));

// --- DB
await connectDB();

// --- Routes
app.use("/api/upload/chat", chatUploadRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/requests", requestRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/providers", providerRoutes);

app.get('/', (_req, res) => res.json({ ok: true, service: 'Osta API' }));

// --- Server & Socket setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// --- Socket Logic
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // User joins chat room
  socket.on("join", (chatId) => {
    socket.join(chatId);
    console.log(`📥 Joined room: ${chatId}`);
  });

  // When message is sent
  socket.on("message", async (msg) => {
    try {
      const { requestId, senderId, text, type, fileUrl } = msg;
      // 🧩 Save to MongoDB
      const chat = await Chat.findOneAndUpdate(
        { requestId },
        {
          $push: {
            messages: {
              senderId,
              text,
              type: type || "text",
              fileUrl: fileUrl || "",
              delivered: true,
              seen: false,
            },
          },
        },
        { new: true, upsert: true }
      );

      io.to(requestId).emit("newMessage", {
        ...msg,
        delivered: true,
        seen: false,
      });

      console.log("💬 Message stored + broadcasted");
    } catch (e) {
      console.error("❌ Socket message error:", e.message);
    }
  });

  // When chat is opened by recipient
  socket.on("seen", async (data) => {
    try {
      const { requestId, viewerId } = data;
      await Chat.findOneAndUpdate(
        { requestId },
        { $set: { "messages.$[elem].seen": true } },
        { arrayFilters: [{ "elem.senderId": { $ne: viewerId } }] }
      );
      io.to(requestId).emit("messageSeen", data);
      console.log(`👁️ Messages marked seen for chat ${requestId}`);
    } catch (e) {
      console.error("❌ Seen update error:", e.message);
    }
  });
  

  socket.on("disconnect", () =>
    console.log("❌ Client disconnected:", socket.id)
  );
});

// --- Start
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Osta API + Socket.IO live on :${PORT}`);
});
