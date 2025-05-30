// import express from 'express';
// import {
//   getGuests,
//   getMyGuests,
//   getGuestById,
//   createGuest,
//   updateGuestStatus,
//   updateGuest
// } from '../controllers/guestController.js';
// import { protect, admin, member } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// // Member routes
// router.get('/my-guests', protect, member, getMyGuests);
// router.post('/', protect, member, createGuest);

// // Admin routes
// router.get('/', protect, admin, getGuests);
// router.put('/:id/status', protect, admin, updateGuestStatus);

// // Shared routes
// router.route('/:id')
//   .get(protect, getGuestById)
//   .put(protect, updateGuest);

// export default router;

import express from 'express';
import { initiateGuestLogin, verifyGuestOTP } from '../controllers/guestController.js';
import { protectGuest } from '../middlewares/guestMiddleware.js';

const router = express.Router();

// Public routes for guest login
router.post('/login', initiateGuestLogin);
router.post('/verify-otp', verifyGuestOTP);

// Protected route for booking (accessible only to authenticated guests)
router.post('/bookings', protectGuest, (req, res) => {
  res.json({
    success: true,
    message: 'Room booking successful',
    guest: {
      _id: req.guest._id,
      phoneNumber: req.guest.phoneNumber,
    },
  });
});

export default router;