import Chat from "../models/Chat.js";
import { ok, fail } from "../utils/responses.js";

// 🟢 Get chat messages by requestId
export const getChat = async (req, res) => {
  try {
    const { requestId } = req.params;
    const chat = await Chat.findOne({ requestId });
    if (!chat) return ok(res, { messages: [] }); // ✅ no 404
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
      { arrayFilters: [{ "elem.senderId": { $ne: viewerId } }], new: true }
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
