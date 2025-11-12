import express from "express";
import {
  createRequest,
  getProviderRequests,
  getUserRequests,
  updateRequestStatus,
} from "../controllers/requestController.js";

const router = express.Router();

router.post("/", createRequest);
router.get("/provider/:providerId", getProviderRequests);
router.get("/user/:userId", getUserRequests);
router.put("/:id/status", updateRequestStatus);

export default router;
