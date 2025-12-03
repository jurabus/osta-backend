// controllers/chatController.js
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Provider from "../models/Provider.js";
import Request from "../models/Request.js";
import { ok, fail } from "../utils/responses.js";

// ======================================================
// 🟢 Get chat by requestId (ALWAYS includes requestMessage)
// ======================================================
export const getChat = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Load chat
    const chat = await Chat.findOne({ requestId });

    // Load request (for initial message + IDs)
    const request = await Request.findById(requestId);

    const requestMessage = request?.message || "";
    const reqUserId = request?.userId || "";
    const reqProviderId = request?.providerId || "";

    // Load avatars
    let userAvatar = "";
    let providerAvatar = "";

    if (chat?.userId) {
      const usr = await User.findById(chat.userId);
      userAvatar = usr?.avatar || "";
    } else if (reqUserId) {
      const usr = await User.findById(reqUserId);
      userAvatar = usr?.avatar || "";
    }

    if (chat?.providerId) {
      const prov = await Provider.findById(chat.providerId);
      providerAvatar = prov?.avatar || "";
    } else if (reqProviderId) {
      const prov = await Provider.findById(reqProviderId);
      providerAvatar = prov?.avatar || "";
    }

    // If chat does not exist, return meta + requestMessage (frontend inserts msg bubble)
    if (!chat) {
      return ok(res, {
        messages: [],
        requestMessage,
        userAvatar,
        providerAvatar,
        userId: reqUserId,
        providerId: reqProviderId,
        status: "open",
        userReviewed: false,
        providerReviewed: false,
      });
    }

    // Full chat return
    return ok(res, {
      ...chat.toObject(),
      requestMessage,
      userAvatar,
      providerAvatar,
    });

  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ======================================================
// 🟢 Mark messages as seen
// ======================================================
export const markSeen = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { viewerId } = req.body;

    const chat = await Chat.findOneAndUpdate(
      { requestId },
      { $set: { "messages.$[elem].seen": true } },
      {
        arrayFilters: [{ "elem.senderId": { $ne: viewerId } }],
        new: true,
      }
    );

    if (!chat) return ok(res, { messages: [] });
    return ok(res, chat);

  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ======================================================
// 🟢 Send message (corrected type + proper creation)
// ======================================================
export const sendMessage = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { senderId, text, type, fileUrl } = req.body;

    if (!senderId || (!text && !fileUrl))
      return fail(res, 400, "Missing fields");

    // Check if chat closed
    const existingChat = await Chat.findOne({ requestId });
    if (existingChat && existingChat.status === "closed") {
      return fail(res, 400, "Chat is closed. You cannot send messages.");
    }

    const message = {
      senderId,
      text: text || "",
      type: type || (fileUrl ? "image" : "text"),
      fileUrl: fileUrl || "",
      seen: false,
      delivered: true,
      createdAt: new Date(),
    };

    const updated = await Chat.findOneAndUpdate(
      { requestId },
      { $push: { messages: message } },
      { new: true, upsert: true }
    );

    return ok(res, updated);

  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ======================================================
// 🟢 Close chat
// ======================================================
export const closeChat = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { closerId } = req.body;

    if (!closerId) return fail(res, 400, "Missing closerId");

    const chat = await Chat.findOne({ requestId });
    if (!chat) return fail(res, 404, "Chat not found");

    const isUser = chat.userId === closerId;
    const isProvider = chat.providerId === closerId;

    if (!isUser && !isProvider)
      return fail(res, 403, "You cannot close this chat");

    if (chat.status === "closed")
      return ok(res, chat);

    chat.status = "closed";
    chat.closedAt = new Date();
    await chat.save();

    return ok(res, chat);

  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ======================================================
// 🟢 Add review (skip allowed, 0–5 scale, no double-review)
// ======================================================
export const addReview = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewerId, rating, review, skip } = req.body;

    if (!reviewerId) return fail(res, 400, "Missing reviewerId");

    const chat = await Chat.findOne({ requestId });
    if (!chat) return fail(res, 404, "Chat not found");

    if (chat.status !== "closed")
      return fail(res, 400, "Chat must be closed before reviewing");

    const isUser = chat.userId === reviewerId;
    const isProvider = chat.providerId === reviewerId;

    if (!isUser && !isProvider)
      return fail(res, 403, "Not part of this chat");

    // Prevent double-review
    if (isUser && chat.userReviewed)
      return fail(res, 400, "User already reviewed");

    if (isProvider && chat.providerReviewed)
      return fail(res, 400, "Provider already reviewed");

    // Only rate if not skip
    if (!skip) {
      if (rating == null)
        return fail(res, 400, "Missing rating");

      const numeric = Number(rating);
      if (numeric < 0 || numeric > 5)
        return fail(res, 400, "Rating must be between 0 and 5");

      if (isUser) {
        const provider = await Provider.findById(chat.providerId);
        if (provider) {
          provider.ratings.push(numeric);
          if (review) provider.reviews.push(review);
          await provider.save();
        }
      }

      if (isProvider) {
        const user = await User.findById(chat.userId);
        if (user) {
          user.ratings.push(numeric);
          if (review) user.reviews.push(review);
          await user.save();
        }
      }
    }

    // Mark review as done
    if (isUser) chat.userReviewed = true;
    if (isProvider) chat.providerReviewed = true;

    await chat.save();
    return ok(res, chat);

  } catch (e) {
    return fail(res, 400, e.message);
  }
};
