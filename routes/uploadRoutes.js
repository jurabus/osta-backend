import express from "express";
import multer from "multer";
import bucket from "../firebase.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }).single("image");

// Extract path from ANY Firebase URL (old or new style)
function extractFilePath(url) {
  try {
    const decoded = decodeURIComponent(url);

    // Works for BOTH old and new bucket systems
    const match =
      decoded.match(/\/o\/(.+)\?/) || // old style
      decoded.match(new RegExp(`${bucket.name}\/(.+)$`)); // new GCS style

    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// DELETE Firebase file
async function deleteFileByUrl(url) {
  const filePath = extractFilePath(url);
  if (!filePath) return;

  try {
    await bucket.file(filePath).delete({ ignoreNotFound: true });
    console.log(`🗑 Deleted: ${filePath}`);
  } catch (e) {
    console.warn("⚠ Delete failed:", e.message);
  }
}

// POST /api/upload
router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err)
      return res.status(400).json({ success: false, message: err.message });

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No image uploaded" });

    try {
      const oldUrl = req.body.oldUrl;

      const fileName = `uploads/${Date.now()}-${uuidv4()}-${
        req.file.originalname
      }`;

      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
          cacheControl: "public, max-age=31536000",
        },
      });

      // Make file public
      await file.makePublic();

      // ⭐ FIX: USE new GCS public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;


      if (oldUrl) await deleteFileByUrl(oldUrl);

      return res.json({ success: true, url: publicUrl });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: error.message });
    }
  });
});

export default router;
