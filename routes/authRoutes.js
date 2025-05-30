import express from 'express';
import {
  registerUser,
  // loginUser,
  getUserProfile,
  updateUserProfile,
  verifyReferenceCode,
  verifyOTP,
  initiateLogin
} from '../controllers/authController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
// router.post('/login', loginUser);
router.post('/verify-reference', verifyReferenceCode);

// Protected routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Admin routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP)
router.post('/login', initiateLogin)

export default router;