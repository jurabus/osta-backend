// controllers/requestController.js
import Request from "../models/Request.js";
import Chat from "../models/Chat.js";
import { ok, fail } from "../utils/responses.js";

// 🟢 Create new request
export const createRequest = async (req, res) => {
  try {
    const { userId, providerId, message } = req.body;
    if (!userId || !providerId)
      return fail(res, 400, "Missing userId or providerId");

    const doc = await Request.create({ userId, providerId, message });
    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// 🟢 Get all requests for a provider + chat meta
export const getProviderRequests = async (req, res) => {
  try {
    const { providerId } = req.params;
    const base = await Request.find({ providerId })
      .sort({ createdAt: -1 })
      .lean();

    const withChat = await Promise.all(
      base.map(async (r) => {
        const chat = await Chat.findOne({ requestId: r._id.toString() }).lean();

        return {
          ...r,
          chatStatus: chat?.status ?? "open",
          userReviewed: chat?.userReviewed ?? false,
          providerReviewed: chat?.providerReviewed ?? false,
        };
      })
    );

    return ok(res, withChat);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// 🟢 Get all requests for a user + chat meta
export const getUserRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const base = await Request.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const withChat = await Promise.all(
      base.map(async (r) => {
        const chat = await Chat.findOne({ requestId: r._id.toString() }).lean();

        return {
          ...r,
          chatStatus: chat?.status ?? "open",
          userReviewed: chat?.userReviewed ?? false,
          providerReviewed: chat?.providerReviewed ?? false,
        };
      })
    );

    return ok(res, withChat);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// 🟢 Update request status
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status))
      return fail(res, 400, "Invalid status");

    const doc = await Request.findByIdAndUpdate(id, { status }, { new: true });
    if (!doc) return fail(res, 404, "Request not found");

    // If accepted, auto-create chat room
    if (status === "accepted") {
      const existing = await Chat.findOne({ requestId: doc._id.toString() });
      if (!existing) {
        await Chat.create({
          requestId: doc._id.toString(),
          userId: doc.userId,
          providerId: doc.providerId,
          messages: [],
        });
      }
    }

    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
