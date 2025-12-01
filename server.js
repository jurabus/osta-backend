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
import uploadRoutes from './routes/uploadRoutes.js';
import chatUploadRoutes from './routes/chatUploadRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import Chat from './models/Chat.js';
import fs from "fs";
import path from "path";
import subcategoryRoutes from "./routes/subcategoryRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import regionRoutes from "./routes/regionRoutes.js";


// 🧱 Ensure required upload directories exist
const uploadDirs = ["uploads", "uploads/chat"];
uploadDirs.forEach((dir) => {
  const fullPath = path.resolve(dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created missing directory: ${fullPath}`);
  }
});

// 🧹 Auto-clean old chat uploads (>30 days)
const CLEANUP_DAYS = 30;
const now = Date.now();

const chatDir = path.resolve("uploads/chat");
if (fs.existsSync(chatDir)) {
  fs.readdir(chatDir, (err, files) => {
    if (err) return console.error("Cleanup error:", err);
    files.forEach((file) => {
      const filePath = path.join(chatDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageDays > CLEANUP_DAYS) {
          fs.unlink(filePath, (err) => {
            if (!err) console.log(`🧽 Deleted old file: ${file}`);
          });
        }
      });
    });
  });
}

// Run cleanup daily
setInterval(() => {
  console.log("🧹 Running daily chat upload cleanup...");
  // reuse same cleanup logic here
}, 1000 * 60 * 60 * 24); // every 24h

// --- Initialize express app
const app = express();

// --- Middleware & security
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(morgan('dev'));

// --- Database
await connectDB();

// --- Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use('/api/upload/chat', chatUploadRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/requests', requestRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);

// --- Health check
app.get('/', (_req, res) => res.json({ ok: true, service: 'Osta API' }));

// --- Create HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// ======================================================
// 🧠 SOCKET.IO LOGIC
// ======================================================
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // --- Join room & ensure chat exists
  socket.on('join', async (requestId) => {
    try {
      socket.join(requestId);
      console.log(`📥 Joined room: ${requestId}`);

      // 🟢 Ensure chat exists (auto-create)
      const existing = await Chat.findOne({ requestId });
      if (!existing) {
        await Chat.create({ requestId, messages: [] });
        console.log(`✨ New chat created for request ${requestId}`);
      }
    } catch (e) {
      console.error('❌ Join error:', e.message);
    }
  });

  // --- Handle message sending
  socket.on('message', async (msg) => {
    try {
      const { requestId, senderId, text, type, fileUrl, senderName } = msg;
      if (!requestId || !senderId) return;

      // 🧩 Save message (upsert ensures chat exists)
      const chat = await Chat.findOneAndUpdate(
        { requestId },
        {
          $push: {
            messages: {
              senderId,
			  senderName: senderName || "Unknown",
              text,
              type: type || (fileUrl ? 'image' : 'text'),
              fileUrl: fileUrl || '',
              delivered: true,
              seen: false,
            },
          },
        },
        { new: true, upsert: true }
      );

      // 🟢 Broadcast message to room
      io.to(requestId).emit('newMessage', {
        ...msg,
        delivered: true,
        seen: false,
      });

      console.log(`💬 Message stored + broadcasted (${requestId})`);
    } catch (e) {
      console.error('❌ Socket message error:', e.message);
    }
  });

  // --- Handle messages marked as seen
  socket.on('seen', async (data) => {
    try {
      const { requestId, viewerId } = data;
      if (!requestId || !viewerId) return;

      await Chat.findOneAndUpdate(
        { requestId },
        { $set: { 'messages.$[elem].seen': true } },
        { arrayFilters: [{ 'elem.senderId': { $ne: viewerId } }] }
      );

      io.to(requestId).emit('messageSeen', data);
      console.log(`👁️ Messages marked seen for chat ${requestId}`);
    } catch (e) {
      console.error('❌ Seen update error:', e.message);
    }
  });

  // --- Disconnect
  socket.on('disconnect', () =>
    console.log('❌ Client disconnected:', socket.id)
  );
});

// --- Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Osta API + Socket.IO live on :${PORT}`);
});
