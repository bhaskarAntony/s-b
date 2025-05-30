import express from 'express';
import {
  createRoom,
  getRooms,
  getAvailableRooms,
  getRoomById,
  updateRoom,
  toggleRoomBlock,
  seedRooms
} from '../controllers/roomController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getRooms);
router.get('/available', getAvailableRooms);
router.get('/:id', getRoomById);

// Admin routes
router.post('/', protect, admin, createRoom);
router.put('/:id', protect, admin, updateRoom);
router.put('/:id/block', protect, admin, toggleRoomBlock);
// router.post('/seed', protect, admin, seedRooms);

export default router;