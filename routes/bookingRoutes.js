import express from 'express';
import {
  createRoomBooking,
  createServiceBooking,
  getBookings,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  updatePaymentStatus,
  getBookingStats,
  getCancellationStats,
  checkOutBooking,
  checkInBooking
} from '../controllers/bookingController.js';
import { protect, admin, member } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Member routes
router.get('/my-bookings', protect, getMyBookings);
router.post('/room', protect, member, createRoomBooking);
router.post('/service', protect, member, createServiceBooking);

// Admin routes
router.get('/', getBookings);
router.put('/:id/status', protect, admin, updateBookingStatus);
router.put('/:id/payment', protect, admin, updatePaymentStatus);
router.put('/:id/checkIn', protect, admin, checkInBooking);
router.put('/:id/checkOut', protect, admin, checkOutBooking);
router.get('/stats', getBookingStats);
router.get('/api/bookings/cancellations', getCancellationStats);

// Shared routes
router.get('/:id', protect, getBookingById);

export default router;

// import express from 'express';
// import {
//   createRoomBooking,
//   createServiceBooking,
//   getBookings,
//   getMyBookings,
//   getBookingById,
//   updateBookingStatus,
//   updatePaymentStatus,
//   getBookingStats,
//   getCancellationStats,
//   checkInBooking,
//   checkOutBooking,
//   // markPaymentSuccess,
// } from '../controllers/bookingController.js';
// import { protect, admin, member } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// // Public routes
// router.post('/room', createRoomBooking); // Allow public access for non-member bookings

// // Member routes
// router.get('/my-bookings', protect, getMyBookings);
// router.post('/service', protect, member, createServiceBooking);

// // Admin routes
// router.get('/', protect, admin, getBookings);
// router.put('/:id/status', protect, admin, updateBookingStatus);
// router.put('/:id/payment', protect, admin, updatePaymentStatus);
// router.put('/:id/checkin', protect, admin, checkInBooking);
// router.put('/:id/checkout', protect, admin, checkOutBooking);
// // router.put('/:id/payment-success', protect, admin, markPaymentSuccess);
// router.get('/stats', protect, admin, getBookingStats);
// router.get('/cancellations', protect, admin, getCancellationStats);

// // Shared routes
// router.get('/:id', protect, getBookingById);

// export default router;