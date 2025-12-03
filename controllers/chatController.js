// controllers/chatController.js
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Provider from "../models/Provider.js";
import { ok, fail } from "../utils/responses.js";
import Request from "../models/Request.js";

// ======================================================
// 🟢 Get chat by requestId (includes requestMessage + avatars)
// ======================================================
export const getChat = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Load chat
    const chat = await Chat.findOne({ requestId });

    // Load original request (needed for initial message)
    const request = await Request.findById(requestId);
    const requestMessage = request ? (request.message || "") : "";

    // Load both avatars
    let userAvatar = "";
    let providerAvatar = "";

    if (chat?.userId) {
      const user = await User.findById(chat.userId);
      userAvatar = user?.avatar || "";
    }

    if (chat?.providerId) {
      const provider = await Provider.findById(chat.providerId);
      providerAvatar = provider?.avatar || "";
    }

    // If no chat exists (chat not created yet), return metadata + request message
    if (!chat) {
      return ok(res, {
        messages: [],
        requestMessage,
        userAvatar,
        providerAvatar,
        userId: request?.userId || "",
        providerId: request?.providerId || "",
        status: "open",
      });
    }

    // Return full chat object
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
// 🟢 Send message (fully fixed - no forced type=image)
// ======================================================
export const sendMessage = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { senderId, text, type, fileUrl } = req.body;

    if (!senderId || (!text && !fileUrl))
      return fail(res, 400, "Missing fields");

    // Prevent sending to closed chat
    const existingChat = await Chat.findOne({ requestId });
    if (existingChat && existingChat.status === "closed") {
      return fail(res, 400, "Chat is closed. You cannot send new messages.");
    }

    const newMessage = {
      senderId,
      text: text || "",
      type: type || (fileUrl ? "image" : "text"),
      fileUrl: fileUrl || "",
      seen: false,
      delivered: true,
      createdAt: new Date(),
    };

    const chat = await Chat.findOneAndUpdate(
      { requestId },
      { $push: { messages: newMessage } },
      { new: true, upsert: true }
    );

    return ok(res, chat);
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

    if (!isUser && !isProvider) {
      return fail(res, 403, "Not allowed to close this chat");
    }

    if (chat.status === "closed") {
      return ok(res, chat);
    }

    chat.status = "closed";
    chat.closedAt = new Date();

    await chat.save();

    return ok(res, chat);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ======================================================
// 🟢 Add review (0–5 scale, skip allowed, each side only once)
// ======================================================
export const addReview = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewerId, rating, review, skip } = req.body;

    if (!reviewerId) return fail(res, 400, "Missing reviewerId");

    const chat = await Chat.findOne({ requestId });
    if (!chat) return fail(res, 404, "Chat not found");

    if (chat.status !== "closed") {
      return fail(res, 400, "Chat must be closed before submitting a review");
    }

    const isUser = chat.userId === reviewerId;
    const isProvider = chat.providerId === reviewerId;

    if (!isUser && !isProvider) {
      return fail(res, 403, "You are not part of this chat");
    }

    if (isUser && chat.userReviewed) {
      return fail(res, 400, "User already reviewed");
    }
    if (isProvider && chat.providerReviewed) {
      return fail(res, 400, "Provider already reviewed");
    }

    // If submitting rating (not skip)
    if (!skip) {
      if (rating == null)
        return fail(res, 400, "Missing rating");

      const numericRating = Number(rating);
      if (numericRating < 0 || numericRating > 5)
        return fail(res, 400, "Rating must be between 0 and 5");

      // USER → reviews PROVIDER
      if (isUser) {
        const provider = await Provider.findById(chat.providerId);
        if (provider) {
          provider.ratings.push(numericRating);
          if (review) provider.reviews.push(review);
          await provider.save();
        }
      }

      // PROVIDER → reviews USER
      if (isProvider) {
        const user = await User.findById(chat.userId);
        if (user) {
          user.ratings.push(numericRating);
          if (review) user.reviews.push(review);
          await user.save();
        }
      }
    }

    if (isUser) chat.userReviewed = true;
    if (isProvider) chat.providerReviewed = true;

    await chat.save();

    return ok(res, chat);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
