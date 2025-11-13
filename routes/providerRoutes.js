import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { signup, login, listProviders, updateProvider, addRating } from '../controllers/providerController.js';

const router = express.Router();

// auth
router.post('/signup', signup);
router.post('/login', login);

// read/search
router.get('/', listProviders);                   // ?category=photography
router.get('/:id', getProvider);

// admin-ish crud
router.post('/', verifyToken, createProvider);
router.put('/:id', verifyToken, updateProvider);
router.delete('/:id', verifyToken, deleteProvider);

// rating
router.post('/:id/rate', addRating);

export default router;
