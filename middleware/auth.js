import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, kind: 'user'|'provider' }
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
