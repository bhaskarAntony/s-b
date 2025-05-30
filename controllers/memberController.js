import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import emailService from '../utils/emailService.js';

// @desc    Get all members
// @route   GET /api/members
// @access  Admin
export const getMembers = async (req, res) => {
  try {
    const members = await User.find({ role: 'member' }).select('-password');
    
    res.json({
      success: true,
      count: members.length,
      members
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single member
// @route   GET /api/members/:id
// @access  Admin
export const getMemberById = async (req, res) => {
  try {
    const member = await User.findById(req.params.id).select('-password');
    
    if (!member || member.role !== 'member') {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    // Get member's bookings
    const bookings = await Booking.find({ userId: member._id }).sort({ createdAt: -1 });
    
    // Get guests referred by this member
    const guests = await Guest.find({ referredBy: member._id });
    
    res.json({
      success: true,
      member,
      bookings,
      guests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new member
// @route   POST /api/members
// @access  Admin
export const createMember = async (req, res) => {
  try {
    const { name, email, phoneNumber, designation } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Generate a random password
    const password = Math.random().toString(36).slice(-8);
    
    // Create member
    const member = await User.create({
      name,
      email,
      password,
      phoneNumber,
      designation,
      role: 'member'
    });
    
    // Send email with credentials
    await emailService.sendRegistrationEmail(member, password);
    
    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        phoneNumber: member.phoneNumber,
        designation: member.designation,
        referenceCode: member.referenceCode,
        role: member.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a member
// @route   PUT /api/members/:id
// @access  Admin
export const updateMember = async (req, res) => {
  try {
    const { name, phoneNumber, designation, status } = req.body;
    
    const member = await User.findById(req.params.id);
    
    if (!member || member.role !== 'member') {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    // Update fields
    if (name) member.name = name;
    if (phoneNumber) member.phoneNumber = phoneNumber;
    if (designation) member.designation = designation;
    if (status) member.status = status;
    
    const updatedMember = await member.save();
    
    res.json({
      success: true,
      message: 'Member updated successfully',
      member: {
        _id: updatedMember._id,
        name: updatedMember.name,
        email: updatedMember.email,
        phoneNumber: updatedMember.phoneNumber,
        designation: updatedMember.designation,
        referenceCode: updatedMember.referenceCode,
        role: updatedMember.role,
        status: updatedMember.status
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a member
// @route   DELETE /api/members/:id
// @access  Admin
export const deleteMember = async (req, res) => {
  try {
    const member = await User.findById(req.params.id);
    
    if (!member || member.role !== 'member') {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    // Check if member has active bookings
    const activeBookings = await Booking.findOne({ 
      userId: member._id,
      status: { $in: ['confirmed', 'pending'] },
      checkOut: { $gt: new Date() }
    });
    
    if (activeBookings) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete member with active bookings' 
      });
    }
    
    await member.remove();
    
    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get member's bookings
// @route   GET /api/members/:id/bookings
// @access  Admin
export const getMemberBookings = async (req, res) => {
  try {
    const member = await User.findById(req.params.id);
    
    if (!member || member.role !== 'member') {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    const bookings = await Booking.find({ userId: member._id })
      .populate('roomId')
      .populate('serviceId')
      .populate('guestId')
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

// @desc    Reset member password
// @route   POST /api/members/:id/reset-password
// @access  Admin
export const resetMemberPassword = async (req, res) => {
  try {
    const member = await User.findById(req.params.id);
    
    if (!member || member.role !== 'member') {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    // Generate a random password
    const password = Math.random().toString(36).slice(-8);
    
    // Update password
    member.password = password;
    await member.save();
    
    // Send email with new credentials
    await emailService.sendRegistrationEmail(member, password);
    
    res.json({
      success: true,
      message: 'Password reset successful, new credentials sent to member\'s email'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export default {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberBookings,
  resetMemberPassword
};