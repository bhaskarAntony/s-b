import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Service from '../models/Service.js';
import Guest from '../models/Guest.js';
import User from '../models/User.js';
import emailService from '../utils/emailService.js';

// @desc    Create a new room booking
// @route   POST /api/bookings/room
// @access  Private/Public
export const createRoomBooking = async (req, res) => {
  try {
    const {
      roomId, // Single room ID (string)
      checkIn,
      checkOut,
      bookingFor,
      relation,
      occupantDetails,
      totalCost,
      sporti,
      roomType,
      officerDetails, // Included for non-members
    } = req.body;

    const user = req.user; // From auth middleware
    const isAdmin = user?.role === 'admin';
    const isMember = !!user; // Member if user is authenticated

    // Validate required fields
    if (!checkIn || !checkOut || !bookingFor || !relation || !sporti || !roomType || !occupantDetails) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate occupant details
    if (!occupantDetails.name || !/^\d{10}$/.test(occupantDetails.phoneNumber) || !occupantDetails.gender || !occupantDetails.location) {
      return res.status(400).json({ success: false, message: 'Invalid occupant details' });
    }

    // For members, ensure userId is set
    if (isMember && !user._id) {
      return res.status(401).json({ success: false, message: 'User authentication required for member booking' });
    }

    let validatedRoomId = null;
    let calculatedTotalCost = totalCost || 0;
    let bookingStatus = isAdmin ? 'confirmed' : 'pending';

    // Validate roomId for Self, Batchmate, or Admin bookings
    if (bookingFor === 'Self' || relation === 'Batchmate' || isAdmin) {
      if (!roomId) {
        return res.status(400).json({ success: false, message: 'Room ID is required' });
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const numberOfNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: `Room ${roomId} not found` });
      }
      if (room.isBlocked) {
        return res.status(400).json({ success: false, message: `Room ${room.roomNumber} is unavailable` });
      }
      if (room.sporti !== sporti || room.category !== roomType) {
        return res.status(400).json({ success: false, message: `Room ${room.roomNumber} does not match selected sporti or room type` });
      }

      // Check for overlapping bookings
      const existingBooking = await Booking.findOne({
        roomId,
        status: { $in: ['confirmed', 'pending'] },
        $or: [
          { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
        ],
      });
      if (existingBooking) {
        return res.status(400).json({ success: false, message: `Room ${room.roomNumber} is already booked for the selected dates` });
      }

      // Calculate cost for this room
      const pricePerNight = bookingFor === 'Self' || relation === 'Batchmate' ? room.price.member : room.price.guest;
      calculatedTotalCost = pricePerNight * numberOfNights;
      validatedRoomId = roomId;

      // Admin bookings are always confirmed
      bookingStatus = isAdmin ? 'confirmed' : 'pending';
    } else if (bookingFor === 'Guest' && isMember) {
      // For member-booked guests, roomId is optional
      validatedRoomId = roomId || null;
      calculatedTotalCost = validatedRoomId ? calculatedTotalCost : 0; // Cost calculated later if no room
    }

    // Prepare booking data
    const bookingData = {
      userId: isMember ? user._id : null,
      bookingType: 'room',
      roomId: validatedRoomId, // Single room ID
      bookingFor,
      relation,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalCost: calculatedTotalCost,
      sporti,
      roomType,
      status: bookingStatus,
      occupantDetails,
      officerDetails: isMember ? null : officerDetails, // Officer details only for non-members
    };

    // Create booking
    const booking = await Booking.create(bookingData);

    // Update room status for confirmed bookings
    if (bookingStatus === 'confirmed' && validatedRoomId) {
      await Room.updateOne(
        { _id: validatedRoomId },
        {
          isBooked: true,
          checkInDate: new Date(checkIn),
          checkOutDate: new Date(checkOut),
        }
      );

      // Send confirmation email for Self bookings
      if (bookingFor === 'Self') {
        const room = await Room.findById(validatedRoomId);
        await emailService.sendBookingConfirmationEmail(booking, user, [room]); // Pass as array for compatibility
      }
    }

    res.status(201).json({
      success: true,
      message: bookingStatus === 'confirmed' ? 'Booking confirmed successfully' : 'Booking request sent successfully and pending approval',
      booking,
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new service booking
// @route   POST /api/bookings/service
// @access  Private
export const createServiceBooking = async (req, res) => {
  try {
    const { 
      serviceId, 
      eventDate,
      durationDays, 
      guestCount,
      totalCost,
      sporti
    } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required for service booking' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const checkIn = new Date(eventDate);
    const checkOut = new Date(eventDate);
    checkOut.setDate(checkOut.getDate() + durationDays);
    
    const existingBooking = await Booking.findOne({
      serviceId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }
      ]
    });
    
    if (existingBooking) {
      return res.status(400).json({ success: false, message: 'Service is already booked for the selected dates' });
    }
    
    const booking = await Booking.create({
      userId: req.user._id,
      bookingType: 'service',
      serviceId,
      checkIn,
      checkOut,
      bookingFor: 'Self',
      totalCost,
      sporti,
      status: req.user.role === 'admin' ? 'confirmed' : 'pending'
    });
    
    if (booking) {
      await emailService.sendBookingConfirmationEmail(booking, req.user, null);
    }
    
    res.status(201).json({
      success: true,
      message: req.user.role === 'admin' ? 
        'Service booking confirmed successfully' : 
        'Service booking request sent successfully and pending approval',
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all bookings (with member filter)
// @route   GET /api/bookings
// @access  Admin
export const getBookings = async (req, res) => {
  try {
    const { status, bookingType, sporti, paymentStatus, bookingFor, isMember } = req.query;
    
    // let filter = {};
    // if (status) filter.status = status;
    // if (bookingType) filter.bookingType = bookingType;
    // if (sporti) filter.sporti = sporti;
    // if (paymentStatus) filter.paymentStatus = paymentStatus;
    // if (bookingFor) filter.bookingFor = bookingFor;
    // // Filter for member bookings
    // if (isMember === 'true') {
    //   filter.userId = { $ne: null };
    // }

    const bookings = await Booking.find()
      // .populate('userId', 'name email referenceCode')
      // .populate('roomId')
      // .populate('serviceId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get bookings for current user
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('roomId')
      .populate('serviceId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email referenceCode')
      .populate('roomId')
      .populate('serviceId');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    if (req.user.role !== 'admin' && booking.userId?.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to view this booking' });
    }
    
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Admin
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, remarks, roomId, totalCost } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('userId')
      .populate('roomId')
      .populate('guestId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    let calculatedTotalCost = totalCost || booking.totalCost;

    // Handle room assignment for room bookings
    if (booking.bookingType === 'room' && roomId && !booking.roomId) {
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }
      if (room.isBlocked) {
        return res.status(400).json({ success: false, message: 'Room is currently unavailable' });
      }
      if (room.sporti !== booking.sporti || room.category !== booking.roomType) {
        return res.status(400).json({ success: false, message: 'Room does not match booking sporti or room type' });
      }

      // Check for overlapping bookings
      const existingBooking = await Booking.findOne({
        roomId,
        status: { $in: ['confirmed', 'pending'] },
        _id: { $ne: booking._id }, // Exclude the current booking
        $or: [
          { checkIn: { $lt: booking.checkOut }, checkOut: { $gt: booking.checkIn } }
        ]
      });
      if (existingBooking) {
        return res.status(400).json({ success: false, message: 'Room is already booked for the selected dates' });
      }

      // Calculate totalCost
      const numberOfNights = Math.ceil(
        Math.abs(new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)
      );
      const pricePerNight = 
        booking.bookingFor === 'Self' || (booking.bookingFor === 'Guest' && booking.relation === 'Batchmate')
          ? room.price.member
          : room.price.guest;
      calculatedTotalCost = pricePerNight * numberOfNights;

      // Update room's isBooked status
      await Room.findByIdAndUpdate(roomId, { isBooked: true });
    }

    // Update booking
    booking.status = status;
    if (remarks) booking.remarks = remarks;
    if (roomId && !booking.roomId) booking.roomId = roomId;
    booking.totalCost = calculatedTotalCost;

    await booking.save();

    const user = await User.findById(booking.userId);
    let statusMessage = '';

    switch (status) {
      case 'confirmed':
        statusMessage = 'Your booking has been confirmed.';
        break;
      case 'rejected':
        statusMessage = 'Your booking request has been rejected.';
        break;
      case 'cancelled':
        statusMessage = 'Your booking has been cancelled.';
        break;
      case 'completed':
        statusMessage = 'Your booking has been marked as completed.';
        break;
      default:
        statusMessage = `Your booking status has been updated to ${status}.`;
    }

    if (status === 'confirmed' && booking.roomId) {
      const room = await Room.findById(booking.roomId);
      await emailService.sendBookingConfirmationEmail(booking, user, [room], booking.guestId ? await Guest.findById(booking.guestId) : null);
    } else {
      await emailService.sendBookingStatusEmail(booking, user, statusMessage);
    }

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/bookings/:id/payment
// @access  Admin
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.paymentStatus = paymentStatus;
    await booking.save();

    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Mark booking as checked-in
// @route   PUT /api/bookings/:id/checkin
// @access  Admin
export const checkInBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId').populate('roomId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Booking must be confirmed to check-in' });
    }

    if (!booking.roomId) {
      return res.status(400).json({ success: false, message: 'Room must be assigned to check-in' });
    }

    booking.status = 'completed';
    await booking.save();

    await emailService.sendCheckInEmail(booking, booking.userId);

    res.json({
      success: true,
      message: 'Booking checked-in successfully',
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Mark booking as checked-out
// @route   PUT /api/bookings/:id/checkout
// @access  Admin
export const checkOutBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId').populate('roomId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Booking must be checked-in to check-out' });
    }

    if (booking.roomId) {
      await Room.updateOne({ _id: booking.roomId }, { isBooked: false, checkInDate: null, checkOutDate: null });
    }

    booking.status = 'completed';
    await booking.save();

    await emailService.sendCheckOutEmail(booking, booking.userId);

    res.json({
      success: true,
      message: 'Booking checked-out successfully',
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Admin
export const getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate, bookingType, status, sporti, paymentStatus, bookingFor, isMember } = req.query;
    
    let match = {};
    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (bookingType) match.bookingType = bookingType;
    if (status) match.status = status;
    if (sporti) match.sporti = sporti;
    if (paymentStatus) match.paymentStatus = paymentStatus;
    if (bookingFor) match.bookingFor = bookingFor;
    if (isMember === 'true') match.userId = { $ne: null };

    const stats = {
      statusCounts: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$totalCost' }
          }
        }
      ]),
      typeCounts: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$bookingType',
            count: { $sum: 1 },
            revenue: { $sum: '$totalCost' }
          }
        }
      ]),
      monthlyBookings: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            count: { $sum: 1 },
            revenue: { $sum: '$totalCost' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      locationCounts: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$sporti',
            count: { $sum: 1 },
            revenue: { $sum: '$totalCost' }
          }
        }
      ]),
      guestVsSelfCounts: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$bookingFor',
            count: { $sum: 1 },
            revenue: { $sum: '$totalCost' }
          }
        }
      ]),
      paymentStatusCounts: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            amount: { $sum: '$totalCost' }
          }
        }
      ]),
      totalRevenue: await Booking.aggregate([
        { $match: { ...match, paymentStatus: 'paid' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalCost' }
          }
        }
      ]),
      averageBookingValue: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            avg: { $avg: '$totalCost' },
            count: { $sum: 1 }
          }
        }
      ]),
    };

    res.json({
      success: true,
      stats: {
        ...stats,
        totalRevenue: stats.totalRevenue.length > 0 ? stats.totalRevenue[0].total : 0,
        averageBookingValue: stats.averageBookingValue.length > 0 ? Math.round(stats.averageBookingValue[0].avg) : 0,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get cancellation statistics
// @route   GET /api/bookings/cancellations
// @access  Admin
export const getCancellationStats = async (req, res) => {
  try {
    const { startDate, endDate, sporti, bookingType, isMember } = req.query;

    let match = { status: 'cancelled' };
    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (sporti) match.sporti = sporti;
    if (bookingType) match.bookingType = bookingType;
    if (isMember === 'true') match.userId = { $ne: null };

    const stats = {
      monthlyCancellations: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            count: { $sum: 1 },
            revenueLost: { $sum: '$totalCost' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      typeCancellations: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$bookingType',
            count: { $sum: 1 },
            revenueLost: { $sum: '$totalCost' }
          }
        }
      ]),
      locationCancellations: await Booking.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$sporti',
            count: { $sum: 1 },
            revenueLost: { $sum: '$totalCost' }
          }
        }
      ]),
      cancellations: await Booking.find(match)
        .populate('userId', 'name email')
        .populate('roomId')
        .populate('serviceId')
        .sort({ createdAt: -1 })
        .select('bookingType sporti totalCost remarks createdAt paymentStatus'),
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export default {
  createRoomBooking,
  createServiceBooking,
  getBookings,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  updatePaymentStatus,
  getBookingStats,
  getCancellationStats,
  checkInBooking,
  checkOutBooking,
};