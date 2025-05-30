import express from 'express';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberBookings,
  resetMemberPassword
} from '../controllers/memberController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin routes
router.route('/')
  .get(protect, admin, getMembers)
  .post(protect, admin, createMember);

router.route('/:id')
  .get(protect, admin, getMemberById)
  .put(protect, admin, updateMember)
  .delete(protect, admin, deleteMember);

router.get('/:id/bookings', protect, admin, getMemberBookings);
router.post('/:id/reset-password', protect, admin, resetMemberPassword);

export default router;