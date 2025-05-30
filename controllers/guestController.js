// import Guest from '../models/Guest.js';
// import User from '../models/User.js';
// import Booking from '../models/Booking.js';
// import emailService from '../utils/emailService.js';

// // @desc    Get all guests
// // @route   GET /api/guests
// // @access  Admin
// export const getGuests = async (req, res) => {
//   try {
//     const { status } = req.query;
    
//     let filter = {};
//     if (status) filter.status = status;
    
//     const guests = await Guest.find(filter)
//       .populate('referredBy', 'name email referenceCode')
//       .sort({ createdAt: -1 });
    
//     res.json({
//       success: true,
//       count: guests.length,
//       guests
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// // @desc    Get guests referred by current member
// // @route   GET /api/guests/my-guests
// // @access  Private (Member)
// export const getMyGuests = async (req, res) => {
//   try {
//     const guests = await Guest.find({ referredBy: req.user._id })
//       .sort({ createdAt: -1 });
    
//     res.json({
//       success: true,
//       count: guests.length,
//       guests
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// // @desc    Get a single guest
// // @route   GET /api/guests/:id
// // @access  Private
// export const getGuestById = async (req, res) => {
//   try {
//     const guest = await Guest.findById(req.params.id)
//       .populate('referredBy', 'name email referenceCode');
    
//     if (!guest) {
//       return res.status(404).json({ success: false, message: 'Guest not found' });
//     }
    
//     // Check if user is authorized to view this guest
//     if (req.user.role !== 'admin' && guest.referredBy.toString() !== req.user._id.toString()) {
//       return res.status(401).json({ success: false, message: 'Not authorized to view this guest' });
//     }
    
//     // Get guest's bookings
//     const bookings = await Booking.find({ guestId: guest._id })
//       .populate('roomId')
//       .sort({ createdAt: -1 });
    
//     res.json({
//       success: true,
//       guest,
//       bookings
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// // @desc    Create a guest
// // @route   POST /api/guests
// // @access  Private (Member)
// export const createGuest = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phoneNumber,
//       relationship,
//       gender,
//       age,
//       aadhaarNumber,
//       interests
//     } = req.body;
    
//     // Create guest
//     const guest = await Guest.create({
//       name,
//       email,
//       phoneNumber,
//       relationship,
//       gender,
//       age,
//       aadhaarNumber,
//       interests: interests || [],
//       referredBy: req.user._id,
//       status: 'pending'
//     });
    
//     res.status(201).json({
//       success: true,
//       message: 'Guest created successfully',
//       guest
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// // @desc    Update guest approval status
// // @route   PUT /api/guests/:id/status
// // @access  Admin
// export const updateGuestStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
    
//     const guest = await Guest.findById(req.params.id)
//       .populate('referredBy');
    
//     if (!guest) {
//       return res.status(404).json({ success: false, message: 'Guest not found' });
//     }
    
//     guest.status = status;
//     await guest.save();
    
//     // If guest is approved/rejected, update any pending bookings
//     if (status === 'approved' || status === 'rejected') {
//       const bookings = await Booking.find({ 
//         guestId: guest._id,
//         status: 'pending'
//       });
      
//       for (const booking of bookings) {
//         booking.status = status === 'approved' ? 'confirmed' : 'rejected';
//         await booking.save();
        
//         // Send email notification for booking status change
//         const room = await Room.findById(booking.roomId);
//         await emailService.sendBookingConfirmationEmail(booking, guest.referredBy, room, guest);
//       }
//     }
    
//     res.json({
//       success: true,
//       message: `Guest status updated to ${status}`,
//       guest
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// // @desc    Update guest information
// // @route   PUT /api/guests/:id
// // @access  Private
// export const updateGuest = async (req, res) => {
//   try {
//     const guest = await Guest.findById(req.params.id);
    
//     if (!guest) {
//       return res.status(404).json({ success: false, message: 'Guest not found' });
//     }
    
//     // Check if user is authorized to update this guest
//     if (req.user.role !== 'admin' && guest.referredBy.toString() !== req.user._id.toString()) {
//       return res.status(401).json({ success: false, message: 'Not authorized to update this guest' });
//     }
    
//     // Update fields
//     const updatedGuest = await Guest.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     );
    
//     res.json({
//       success: true,
//       message: 'Guest updated successfully',
//       guest: updatedGuest
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error', error: error.message });
//   }
// };

// export default {
//   getGuests,
//   getMyGuests,
//   getGuestById,
//   createGuest,
//   updateGuestStatus,
//   updateGuest
// };

import Guest from '../models/Guest.js';
import { generateToken } from '../middlewares/guestMiddleware.js';
import { OTPSMS } from '../utils/sms.js';

// @desc    Initiate guest login by sending OTP
// @route   POST /api/auth/guest/login
// @access  Public
export const initiateGuestLogin = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate phone number
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Check if guest exists, or create a new guest
    let guest = await Guest.findOne({ phoneNumber });
    if (!guest) {
      guest = await Guest.create({ phoneNumber });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiration (10 minutes)
    guest.otp = otp;
    guest.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await guest.save();

    // Send OTP via SMS
    await OTPSMS(guest.phoneNumber, 'Guest', otp);

    res.json({
      success: true,
      message: 'OTP sent to your phone number',
      phoneNumber: guest.phoneNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Verify guest OTP and generate token
// @route   POST /api/auth/guest/verify-otp
// @access  Public
export const verifyGuestOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Find guest
    const guest = await Guest.findOne({ phoneNumber });
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    // Check OTP and expiration
    if (!guest.otp || guest.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (guest.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Clear OTP
    guest.otp = undefined;
    guest.otpExpires = undefined;
    await guest.save();

    // Generate token
    const token = generateToken(guest._id);

    res.json({
      success: true,
      isGuestAuthenticated: true,
      guest: {
        _id: guest._id,
        phoneNumber: guest.phoneNumber,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export default { initiateGuestLogin, verifyGuestOTP };