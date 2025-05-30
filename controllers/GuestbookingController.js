import { nanoid } from 'nanoid';
import GuestBooking from '../models/GuestBooking.js';
import Room from '../models/Room.js';
import emailService from '../utils/emailService.js';

// @desc    Create a new room booking for non-members
// @route   POST /api/bookings/room
// @access  Public
export const createRoomBooking = async (req, res) => {
  try {
    const {
      checkIn,
      checkOut,
      sporti,
      roomType,
      bookingFor,
      relation,
      occupantDetails,
      officerDetails,
      totalCost = 0,
    } = req.body;

    // Validate required fields
    if (!checkIn || !checkOut || !sporti || !roomType || !bookingFor || !relation || !occupantDetails || !officerDetails) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate occupant details
    if (
      !occupantDetails.name?.trim() ||
      !/^\d{10}$/.test(occupantDetails.phoneNumber) ||
      !occupantDetails.gender ||
      !occupantDetails.location?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(occupantDetails.email)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid occupant details' });
    }

    // Validate officer details
    if (
      !officerDetails.name?.trim() ||
      !/^\d{10}$/.test(officerDetails.phoneNumber) ||
      !officerDetails.designation?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officerDetails.email)
    ) {
      return res.status(400).json({ success: false, message: 'Valid officer details are required' });
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (isNaN(checkInDate) || isNaN(checkOutDate) || checkInDate >= checkOutDate) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }

    // Validate bookingFor and relation
    const validBookingFor = ['Self', 'Guest'];
    const validRelations = {
      Self: ['Self', 'Spouse', 'Children', 'Parents'],
      Guest: ['Batchmate', 'Friend', 'Relative', 'Acquaintance', 'Spouse'],
    };
    if (!validBookingFor.includes(bookingFor)) {
      return res.status(400).json({ success: false, message: 'Invalid bookingFor value' });
    }
    if (!validRelations[bookingFor].includes(relation)) {
      return res.status(400).json({ success: false, message: 'Invalid relation for selected bookingFor' });
    }

    // Create booking
    const bookingData = {
      applicationNumber: nanoid(10),
      userId: null,
      bookingType: 'room',
      roomId: null,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      sporti,
      roomType,
      bookingFor,
      relation,
      totalCost: 0,
      occupantDetails,
      officerDetails,
      status: 'pending',
      paymentStatus: 'pending',
    };

    const booking = await GuestBooking.create(bookingData);

    // Send submission email
    await emailService.sendBookingSubmissionEmail(booking, null, occupantDetails.email);

    res.status(201).json({
      success: true,
      message: 'Booking request sent successfully',
      booking,
    });
  } catch (error) {
    console.error('Error creating room booking:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get non-member bookings
// @route   GET /api/bookings
// @access  Admin
export const getBookings = async (req, res) => {
  try {
    const {
      status,
      sporti,
      paymentStatus,
      bookingFor,
      isMember,
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      applicationNumber,
    } = req.query;

    let filter = { bookingType: 'room' };
    if (status) filter.status = status;
    if (sporti) filter.sporti = sporti;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (bookingFor) filter.bookingFor = bookingFor;
    if (applicationNumber) filter.applicationNumber = applicationNumber;
    if (isMember === 'false') filter.userId = null;

    const bookings = await GuestBooking.find(filter)
      .populate('roomId')
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const count = await GuestBooking.countDocuments(filter);

    res.json({
      success: true,
      count,
      bookings,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Admin
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, remarks, roomId, totalCost } = req.body;
    const { id } = req.params;

    if (!['confirmed', 'rejected', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const booking = await GuestBooking.findById(id).populate('roomId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    let calculatedTotalCost = totalCost || booking.totalCost;

    // Handle room assignment
    if (status === 'confirmed' && !booking.roomId && roomId) {
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }
      if (room.isBlocked) {
        return res.status(400).json({ success: false, message: `Room ${room.roomNumber} is disabled` });
      }
      if (room.sporti !== booking.sporti || room.category !== booking.roomType) {
        return res.status(400).json({ success: false, message: `Room ${room.roomNumber} does not match booking sporti or room type` });
      }

      // Check room availability
      const existingBooking = await GuestBooking.findOne({
        roomId,
        status: { $in: ['confirmed', 'completed'] },
        _id: { $ne: id },
        $or: [{ checkIn: { $lt: booking.checkOut }, checkOut: { $gt: booking.checkIn } }],
      });
      if (existingBooking) {
        return res.status(400).json({ success: false, message: `Room ${room.roomNumber} is already booked for the selected dates` });
      }

      // Calculate cost
      const numberOfNights = Math.ceil(
        (new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)
      );
      const pricePerNight = (booking.bookingFor === 'Self' || booking.relation === 'Batchmate') ? room.price.member : room.price.guest;
      calculatedTotalCost = pricePerNight * numberOfNights;

      // Update room status
      await Room.findByIdAndUpdate(roomId, {
        isBooked: true,
        checkInDate: booking.checkIn,
        checkOutDate: booking.checkOut,
      });

      booking.roomId = roomId;
    }

    // Reset room if rejected or cancelled
    if (['rejected', 'cancelled'].includes(status) && booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, {
        isBooked: false,
        checkInDate: null,
        checkOutDate: null,
      });
    }

    // Update booking
    booking.status = status;
    if (remarks) booking.remarks = remarks;
    booking.totalCost = calculatedTotalCost;
    await booking.save();

    // Send email notification
    let statusMessage = '';
    switch (status) {
      case 'confirmed':
        statusMessage = 'Your booking has been confirmed. Please proceed with payment at check-in.';
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
    }

    if (status === 'confirmed' && booking.roomId) {
      const room = await Room.findById(booking.roomId);
      await emailService.sendBookingConfirmationEmail(booking, null, [room], booking.occupantDetails.email);
    } else {
      await emailService.sendBookingStatusEmail(booking, null, statusMessage, booking.occupantDetails.email);
    }

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/bookings/:id/payment
// @access  Admin
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const booking = await GuestBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!['pending', 'paid'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    booking.paymentStatus = paymentStatus;
    await booking.save();

    if (paymentStatus === 'paid') {
      await emailService.sendPaymentConfirmationEmail(booking, null, booking.occupantDetails.email);
    }

    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      booking,
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Mark booking as checked-in
// @route   PUT /api/bookings/:id/checkin
// @access  Admin
export const checkInBooking = async (req, res) => {
  try {
    const booking = await GuestBooking.findById(req.params.id).populate('roomId');

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

    await emailService.sendCheckInEmail(booking, null, booking.occupantDetails.email);

    res.json({
      success: true,
      message: 'Booking checked-in successfully',
      booking,
    });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Mark booking as checked-out
// @route   PUT /api/bookings/:id/checkout
// @access  Admin
export const checkOutBooking = async (req, res) => {
  try {
    const booking = await GuestBooking.findById(req.params.id).populate('roomId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Booking must be checked-in to check-out' });
    }

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, {
        isBooked: false,
        checkInDate: null,
        checkOutDate: null,
      });
    }

    booking.status = 'completed';
    await booking.save();

    await emailService.sendCheckOutEmail(booking, null, booking.occupantDetails.email);

    res.json({
      success: true,
      message: 'Booking checked-out successfully',
      booking,
    });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Admin
export const getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate, status, sporti, paymentStatus, bookingFor } = req.query;

    let match = { bookingType: 'room' };
    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) match.status = status;
    if (sporti) match.sporti = sporti;
    if (paymentStatus) match.paymentStatus = paymentStatus;
    if (bookingFor) match.bookingFor = bookingFor;

    const stats = await GuestBooking.aggregate([
      { $match: match },
      {
        $facet: {
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalCost' } } },
          ],
          monthlyBookings: [
            {
              $group: {
                _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                count: { $sum: 1 },
                revenue: { $sum: '$totalCost' },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
          locationCounts: [
            { $group: { _id: '$sporti', count: { $sum: 1 }, revenue: { $sum: '$totalCost' } } },
          ],
          guestVsSelfCounts: [
            { $group: { _id: '$bookingFor', count: { $sum: 1 }, revenue: { $sum: '$totalCost' } } },
          ],
          paymentStatusCounts: [
            { $group: { _id: '$paymentStatus', count: { $sum: 1 }, amount: { $sum: '$totalCost' } } },
          ],
          totalRevenue: [
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalCost' } } },
          ],
          avgBookingValue: [
            { $group: { _id: null, avg: { $avg: '$totalCost' }, count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        statusCounts: stats[0].statusCounts,
        monthlyBookings: stats[0].monthlyBookings,
        locationCounts: stats[0].locationCounts,
        guestVsSelfCounts: stats[0].guestVsSelfCounts,
        paymentStatusCounts: stats[0].paymentStatusCounts,
        totalRevenue: stats[0].totalRevenue[0]?.total || 0,
        averageBookingValue: stats[0].avgBookingValue[0]?.avg ? Math.round(stats[0].avgBookingValue[0].avg) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get cancellation statistics
// @route   GET /api/bookings/cancellations
// @access  Admin
export const getCancellationStats = async (req, res) => {
  try {
    const { startDate, endDate, sporti } = req.query;

    let match = { status: 'cancelled', bookingType: 'room' };
    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (sporti) match.sporti = sporti;

    const stats = await GuestBooking.aggregate([
      { $match: match },
      {
        $facet: {
          monthlyCancellations: [
            {
              $group: {
                _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                count: { $sum: 1 },
                revenueLost: { $sum: '$totalCost' },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
          locationCancellations: [
            { $group: { _id: '$sporti', count: { $sum: 1 }, revenueLost: { $sum: '$totalCost' } } },
          ],
        },
      },
    ]);

    const cancellations = await GuestBooking.find(match)
      .populate('roomId')
      .sort({ createdAt: -1 })
      .select('applicationNumber sporti totalCost remarks createdAt paymentStatus occupantDetails officerDetails');

    res.json({
      success: true,
      stats: {
        monthlyCancellations: stats[0].monthlyCancellations,
        locationCancellations: stats[0].locationCancellations,
        cancellations,
      },
    });
  } catch (error) {
    console.error('Error fetching cancellation stats:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export default {
  createRoomBooking,
  getBookings,
  updateBookingStatus,
  updatePaymentStatus,
  checkInBooking,
  checkOutBooking,
  getBookingStats,
  getCancellationStats,
};