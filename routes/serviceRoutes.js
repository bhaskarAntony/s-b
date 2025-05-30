import express from 'express';
import {
  createService,
  getServices,
  getAvailableServices,
  getServiceById,
  updateService,
  toggleServiceAvailability,
  seedServices
} from '../controllers/serviceController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getServices);
router.get('/available', getAvailableServices);
router.get('/:id', getServiceById);

// Admin routes
router.post('/', protect, admin, createService);
router.put('/:id', protect, admin, updateService);
router.put('/:id/toggle', protect, admin, toggleServiceAvailability);
router.post('/seed', protect, admin, seedServices);

export default router;