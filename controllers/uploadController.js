import bucket from "../firebase.js";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * 🟢 Single file upload
 */
export const uploadImage = (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err)
      return res.status(400).json({ success: false, message: err.message });

    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    try {
      const file = req.file;
      const ext = path.extname(file.originalname) || ".jpg";
      const fileName = `uploads/${uuidv4()}-${Date.now()}${ext}`;
      const blob = bucket.file(fileName);

      // Correct content type
      const contentType =
        file.mimetype ||
        (ext.match(/png/i)
          ? "image/png"
          : ext.match(/jpe?g/i)
          ? "image/jpeg"
          : "application/octet-stream");

      const blobStream = blob.createWriteStream({
        metadata: { contentType, cacheControl: "public, max-age=31536000" },
      });

      blobStream.on("error", (error) => {
        console.error("Upload error:", error);
        res
          .status(500)
          .json({ success: false, message: "Upload failed: " + error.message });
      });

      blobStream.on("finish", async () => {
        const [signedUrl] = await blob.getSignedUrl({
          action: "read",
          expires: "03-01-2035",
        });
        res.status(200).json({ success: true, url: signedUrl });
      });

      blobStream.end(file.buffer);
    } catch (error) {
      console.error("Upload failed:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

/**
 * 🟣 Multiple files upload
 */
export const uploadMultiple = (req, res) => {
  upload.array("images")(req, res, async (err) => {
    if (err)
      return res.status(400).json({ success: false, message: err.message });

    if (!req.files || !req.files.length)
      return res.status(400).json({ success: false, message: "No files uploaded" });

    try {
      const uploadedUrls = await Promise.all(
        req.files.map(async (file) => {
          const ext = path.extname(file.originalname) || ".jpg";
          const fileName = `uploads/${uuidv4()}-${Date.now()}${ext}`;
          const blob = bucket.file(fileName);

          const contentType =
            file.mimetype ||
            (ext.match(/png/i)
              ? "image/png"
              : ext.match(/jpe?g/i)
              ? "image/jpeg"
              : "application/octet-stream");

          await new Promise((resolve, reject) => {
            const stream = blob.createWriteStream({
              metadata: { contentType, cacheControl: "public, max-age=31536000" },
            });
            stream.on("error", reject);
            stream.on("finish", resolve);
            stream.end(file.buffer);
          });

          const [signedUrl] = await blob.getSignedUrl({
            action: "read",
            expires: "03-01-2035",
          });
          return signedUrl;
        })
      );

      res.status(200).json({ success: true, urls: uploadedUrls });
    } catch (error) {
      console.error("Multi upload failed:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

/**
 * 🟠 DELETE uploaded file by signed URL
 */
export const deleteByUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url)
      return res.status(400).json({ success: false, message: "Missing 'url'" });

    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/o\/(.+)\?/);
    if (match && match[1]) {
      const filePath = match[1];
      await bucket.file(filePath).delete({ ignoreNotFound: true });
      console.log(`🗑️ Deleted file: ${filePath}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("deleteByUrl error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
