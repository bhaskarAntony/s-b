import jwt from 'jsonwebtoken';
import Guest from '../models/Guest.js';

// Protect routes for guests
export const protectGuest = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, '133a889e51573dae5d1f527089e91a3c3c4d547490c4e762bd6a3416905a11c811e8c93bdf9a2cac853ae8c6ed89890deff99826d67b469d758667bc26d9df45');

      // Get guest from token
      req.guest = await Guest.findById(decoded.id);
      if (!req.guest) {
        return res.status(401).json({ success: false, message: 'Not authorized, guest not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Generate JWT token for guests
export const generateToken = (id) => {
  return jwt.sign({ id }, '133a889e51573dae5d1f527089e91a3c3c4d547490c4e762bd6a3416905a11c811e8c93bdf9a2cac853ae8c6ed89890deff99826d67b469d758667bc26d9df45', {
    expiresIn: '1h', // Guest tokens expire in 1 hour
  });
};

export default { protectGuest, generateToken };