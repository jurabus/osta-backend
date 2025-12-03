// controllers/requestController.js
import Request from "../models/Request.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Provider from "../models/Provider.js";
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

// 🔧 helper to build user/provider maps from ids
const buildUserMap = async (userIds) => {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (!uniqueIds.length) return {};

  const users = await User.find({ _id: { $in: uniqueIds } })
    .select("name avatar email")
    .lean();

  const map = {};
  for (const u of users) {
    map[u._id.toString()] = u;
  }
  return map;
};

const buildProviderMap = async (providerIds) => {
  const uniqueIds = [...new Set(providerIds)].filter(Boolean);
  if (!uniqueIds.length) return {};

  const providers = await Provider.find({ _id: { $in: uniqueIds } })
    .select("name avatar email")
    .lean();

  const map = {};
  for (const p of providers) {
    map[p._id.toString()] = p;
  }
  return map;
};

// 🟢 Get all requests for a provider + chat meta + user/provider data
export const getProviderRequests = async (req, res) => {
  try {
    const { providerId } = req.params;

    const base = await Request.find({ providerId })
      .sort({ createdAt: -1 })
      .lean();

    // collect all user / provider ids
    const userIds = base.map((r) => r.userId);
    const providerIds = base.map((r) => r.providerId);

    const [userMap, providerMap] = await Promise.all([
      buildUserMap(userIds),
      buildProviderMap(providerIds),
    ]);

    const withMeta = await Promise.all(
      base.map(async (r) => {
        const chat = await Chat.findOne({ requestId: r._id.toString() }).lean();

        const user = userMap[r.userId] || null;
        const provider = providerMap[r.providerId] || null;

        return {
          ...r,
          chatStatus: chat?.status ?? "open",
          userReviewed: chat?.userReviewed ?? false,
          providerReviewed: chat?.providerReviewed ?? false,

          // attached entities
          user,
          provider,

          // convenience fields for frontend
          userName: user?.name ?? null,
          providerName: provider?.name ?? null,
          userAvatar: user?.avatar ?? "",
          providerAvatar: provider?.avatar ?? "",
        };
      })
    );

    return ok(res, withMeta);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// 🟢 Get all requests for a user + chat meta + user/provider data
export const getUserRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    const base = await Request.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const userIds = base.map((r) => r.userId);
    const providerIds = base.map((r) => r.providerId);

    const [userMap, providerMap] = await Promise.all([
      buildUserMap(userIds),
      buildProviderMap(providerIds),
    ]);

    const withMeta = await Promise.all(
      base.map(async (r) => {
        const chat = await Chat.findOne({ requestId: r._id.toString() }).lean();

        const user = userMap[r.userId] || null;
        const provider = providerMap[r.providerId] || null;

        return {
          ...r,
          chatStatus: chat?.status ?? "open",
          userReviewed: chat?.userReviewed ?? false,
          providerReviewed: chat?.providerReviewed ?? false,

          // attached entities
          user,
          provider,

          // convenience fields for frontend
          userName: user?.name ?? null,
          providerName: provider?.name ?? null,
          userAvatar: user?.avatar ?? "",
          providerAvatar: provider?.avatar ?? "",
        };
      })
    );

    return ok(res, withMeta);
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
   // If accepted, auto-create chat room
// If accepted, auto-create chat room
if (status === "accepted") {
  const reqId = doc._id.toString();
  const existing = await Chat.findOne({ requestId: reqId });

  // Always insert original request message if missing
  const originalMessage = doc.message || "";

  if (!existing) {
    // Create fresh chat INCLUDING the request message
    await Chat.create({
      requestId: reqId,
      userId: doc.userId,
      providerId: doc.providerId,
      status: "open",
      messages: originalMessage
        ? [
            {
              senderId: doc.userId,
              text: originalMessage,
              type: "text",
              seen: true,
              delivered: true,
              system: true,
              createdAt: new Date(),
            },
          ]
        : [],
    });
  } else {
    // Chat exists → ensure request message is inserted at top only once
    const already = existing.messages.some(
      (m) =>
        m.system === true &&
        (m.text || "").trim() === originalMessage.trim()
    );

    if (originalMessage && !already) {
      existing.messages.unshift({
        senderId: doc.userId,
        text: originalMessage,
        type: "text",
        seen: true,
        delivered: true,
        system: true,
        createdAt: new Date(),
      });
      await existing.save();
    }
  }
}


}


    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
