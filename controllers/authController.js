import User from '../models/User.js';
import { generateToken } from '../middlewares/authMiddleware.js';
import emailService from '../utils/emailService.js';
import { OTPSMS } from '../utils/sms.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Admin
export const registerUser = async (req, res) => {
  try {
    const { name, email, designation, phoneNumber, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Generate a random password
    const password = Math.random().toString(36).slice(-8);

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phoneNumber,
      designation,
      role: role || 'member'
    });

    // Send email with credentials
    await emailService.sendRegistrationEmail(user, password);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        referenceCode: user.referenceCode,
        role: user.role,
        designation: user.designation,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Initiate login by sending OTP
// @route   POST /api/auth/login
// @access  Public
export const initiateLogin = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Find user
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiration (10 minutes)
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // // Send OTP via email
    await emailService.sendOTPEmail(user, otp);
    await OTPSMS(user.phoneNumber, user.name, otp);

    res.json({
      success: true,
      message: 'OTP sent to your email',
      phoneNumber: user.phoneNumber
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Verify OTP and generate token
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Find user
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check OTP and expiration
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate token and return user data
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        referenceCode: user.referenceCode,
        role: user.role,
        designation: user.designation,
        phoneNumber: user.phoneNumber
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          referenceCode: user.referenceCode,
          role: user.role,
          designation: user.designation,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.name = req.body.fullName || user.name;
      user.phoneNumber = req.body.phone || user.phoneNumber;
      user.designation = req.body.designation || user.designation;
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      
      await updatedUser.save();
      res.json({
        success: true,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          referenceCode: updatedUser.referenceCode,
          role: updatedUser.role,
          designation: updatedUser.designation,
          phoneNumber: updatedUser.phoneNumber
        },
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Verify reference code
// @route   POST /api/auth/verify-reference
// @access  Public
export const verifyReferenceCode = async (req, res) => {
  try {
    const { referenceCode } = req.body;
    
    const user = await User.findOne({ referenceCode });
    
    if (user) {
      res.json({
        success: true,
        member: {
          _id: user._id,
          name: user.name,
          email: user.email,
          referenceCode: user.referenceCode,
          designation: user.designation,
          phoneNumber: user.phoneNumber
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Invalid reference code' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export default { registerUser, initiateLogin, verifyOTP, getUserProfile, updateUserProfile, verifyReferenceCode };