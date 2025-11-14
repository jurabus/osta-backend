// routes/chatRoutes.js
import express from "express";
import {
  getChat,
  sendMessage,
  markSeen,
  closeChat,
  addReview,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/:requestId", getChat);
router.post("/:requestId/message", sendMessage);
router.post("/:requestId/seen", markSeen);

// ⭐ NEW: close chat & submit/skip review
router.post("/:requestId/close", closeChat);
router.post("/:requestId/review", addReview);

export default router;
