import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ok, fail } from '../utils/responses.js';

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

// AUTH
export const signup = async (req, res) => {
  try {
    const user = await User.create(req.body);
    const token = sign({ id: user._id, role: user.role, kind: 'user' });
    return ok(res, { user, token });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return fail(res, 401, 'Invalid credentials');

    const token = sign({ id: user._id, role: 'user', kind: 'user' });
    return ok(res, {
      token,
      kind: 'user',
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// CRUD
export const listUsers = async (_req, res) => ok(res, await User.find().sort({ createdAt: -1 }));
export const getUser = async (req, res) => {
  const doc = await User.findById(req.params.id);
  return doc ? ok(res, doc) : fail(res, 404, 'Not found');
};
export const createUser = async (req, res) => {
  try {
    const doc = await User.create(req.body);
    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
export const updateUser = async (req, res) => {
  try {
    const doc = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return doc ? ok(res, doc) : fail(res, 404, 'Not found');
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
export const deleteUser = async (req, res) => {
  const doc = await User.findByIdAndDelete(req.params.id);
  return doc ? ok(res, { deleted: doc._id }) : fail(res, 404, 'Not found');
};
