import express from "express";
import { getChat, sendMessage, markSeen } from "../controllers/chatController.js";

const router = express.Router();

router.get("/:requestId", getChat);
router.post("/:requestId/message", sendMessage);
router.post("/:requestId/seen", markSeen);

export default router;
