import express from "express";
import {
  uploadImage,
  uploadMultiple,
  deleteByUrl,
} from "../controllers/uploadController.js";

const router = express.Router();

router.post("/", uploadImage);
router.post("/multi", uploadMultiple);
router.delete("/", deleteByUrl);

router.options("/", (_, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

export default router;
