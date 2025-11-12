import express from "express";
import { getChat, sendMessage, markSeen } from "../controllers/chatController.js";

const router = express.Router();

router.get("/room/:requestId", getChat);
router.post("/room/:requestId", sendMessage);
router.post("/:requestId/seen", markSeen); 
export default router;
