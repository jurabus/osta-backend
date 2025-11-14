// controllers/chatController.js
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Provider from "../models/Provider.js";
import { ok, fail } from "../utils/responses.js";

// 🟢 Get chat messages by requestId
export const getChat = async (req, res) => {
  try {
    const { requestId } = req.params;
    const chat = await Chat.findOne({ requestId });
    if (!chat)
      // keep previous behavior: no 404, empty thread
      return ok(res, { messages: [] });

    return ok(res, chat);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// 🟢 Mark messages as seen
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
    if (!chat) return ok(res, { messages: [] }); // ✅ prevent 404
    return ok(res, chat);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// 🟢 Send message
export const sendMessage = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { senderId, text, type, fileUrl } = req.body;
    if (!senderId || (!text && !fileUrl))
      return fail(res, 400, "Missing fields");

    // ❌ Prevent sending messages after chat is closed
    const existingChat = await Chat.findOne({ requestId });
    if (existingChat && existingChat.status === "closed") {
      return fail(res, 400, "Chat is closed. You cannot send new messages.");
    }

    const chat = await Chat.findOneAndUpdate(
      { requestId },
      {
        $push: {
          messages: {
            senderId,
            text,
            type: type || (fileUrl ? "image" : "text"),
            fileUrl,
          },
        },
      },
      { upsert: true, new: true } // ✅ create chat if not exists
    );

    return ok(res, chat);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// 🆕 Close chat (either user or provider can close it)
export const closeChat = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { closerId } = req.body; // userId or providerId

    if (!closerId) return fail(res, 400, "Missing closerId");

    const chat = await Chat.findOne({ requestId });
    if (!chat) return fail(res, 404, "Chat not found");

    const isUser = chat.userId === closerId;
    const isProvider = chat.providerId === closerId;

    if (!isUser && !isProvider) {
      return fail(res, 403, "Not allowed to close this chat");
    }

    if (chat.status === "closed") {
      // already closed, just return
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

// 🆕 Add review after chat is closed
// - The USER reviews the PROVIDER
// - The PROVIDER reviews the USER
// - Each side can review (or skip) only once per chat
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

    // prevent double-review
    if (isUser && chat.userReviewed) {
      return fail(res, 400, "User has already reviewed this chat");
    }
    if (isProvider && chat.providerReviewed) {
      return fail(res, 400, "Provider has already reviewed this chat");
    }

    // If not skipping, validate rating
    if (!skip) {
      if (rating == null || Number.isNaN(Number(rating))) {
        return fail(res, 400, "Missing rating");
      }
      const numericRating = Number(rating);
      if (numericRating < 0 || numericRating > 10) {
        return fail(res, 400, "Rating must be between 0 and 10");
      }

      if (isUser) {
        // USER reviewing PROVIDER
        const provider = await Provider.findById(chat.providerId);
        if (provider) {
          provider.ratings.push(numericRating);
          if (review) provider.reviews.push(review);
          await provider.save();
        }
      } else if (isProvider) {
        // PROVIDER reviewing USER
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
