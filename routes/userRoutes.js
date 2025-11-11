import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  signup, login,
  listUsers, getUser, createUser, updateUser, deleteUser
} from '../controllers/userController.js';

const router = express.Router();

// auth
router.post('/signup', signup);
router.post('/login', login);

// crud
router.get('/', listUsers);                 // GET /api/users
router.get('/:id', getUser);                // GET /api/users/:id
router.post('/', createUser);               // POST /api/users
router.put('/:id', verifyToken, updateUser);// PUT /api/users/:id
router.delete('/:id', verifyToken, deleteUser);

export default router;
