// middleware/adminKey.js
export const requireAdminKey = (req, res, next) => {
  const key = req.headers["x-admin-key"] || req.query.adminKey;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  return next();
};
