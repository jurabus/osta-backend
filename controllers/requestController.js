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

// 🟢 Get all requests for a provider
export const getProviderRequests = async (req, res) => {
  const { providerId } = req.params;
  const data = await Request.find({ providerId }).sort({ createdAt: -1 });
  return ok(res, data);
};

// 🟢 Get all requests for a user
export const getUserRequests = async (req, res) => {
  const { userId } = req.params;
  const data = await Request.find({ userId }).sort({ createdAt: -1 });
  return ok(res, data);
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
      const existing = await Chat.findOne({ requestId: doc._id });
      if (!existing) {
        await Chat.create({
          requestId: doc._id,
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
