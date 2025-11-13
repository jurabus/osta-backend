import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { signup, login, listProviders, updateProvider, addRating, getProvider, } from '../controllers/providerController.js';

const router = express.Router();

// auth
router.post('/signup', signup);
router.post('/login', login);

// NEW: get provider by id (required for dashboard)
router.get('/:id', getProvider);

// read/search
router.get('/', listProviders);   

// admin-ish crud
router.put('/:id', verifyToken, updateProvider);

// rating
router.post('/:id/rate', addRating);

export default router;
