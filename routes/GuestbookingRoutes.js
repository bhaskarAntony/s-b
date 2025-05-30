import express from 'express';
import {
  createRoomBooking,
//   createServiceBooking,
  getBookings,
//   getMyBookings,
//   getBookingById,
  updateBookingStatus,
  updatePaymentStatus,
  getBookingStats,
  getCancellationStats,
  checkInBooking,
  checkOutBooking,
} from '../controllers/GuestbookingController.js';
// import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/room', createRoomBooking); // Non-members can create room bookings

// Private routes
// router.use(protect);
// router.post('/service', createServiceBooking);
// router.get('/my-bookings', getMyBookings);
// router.get('/:id', getBookingById);

// Admin routes
router.get('/',  getBookings);
router.put('/:id/status',  updateBookingStatus);
router.put('/:id/payment',  updatePaymentStatus);
router.put('/:id/checkin',  checkInBooking);
router.put('/:id/checkout',  checkOutBooking);
router.get('/stats',  getBookingStats);
router.get('/cancellations',  getCancellationStats);

export default router;