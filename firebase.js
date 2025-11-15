// firebase.js
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
  let serviceAccount;

  try {
    // Parse service account from Render env variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

      // Fix multiline private key if needed
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
      }
    } else {
      throw new Error("❌ FIREBASE_SERVICE_ACCOUNT environment variable is missing");
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // e.g. elvastore0.firebasestorage.app
    });

    console.log("✅ Firebase Admin initialized successfully");
    console.log(`🪣 Using bucket: ${process.env.FIREBASE_STORAGE_BUCKET}`);
  } catch (error) {
    console.error("🔥 Firebase initialization failed:", error);
    process.exit(1);
  }
}

const bucket = admin.storage().bucket();
export default bucket;
