import Service from '../models/Service.js';
import Booking from '../models/Booking.js';

// @desc    Create a new service
// @route   POST /api/services
// @access  Admin
export const createService = async (req, res) => {
  try {
    const { name, type, sporti, capacity, price, description, facilities } = req.body;
    
    // Create service
    const service = await Service.create({
      name,
      type,
      sporti,
      capacity,
      price,
      description,
      facilities
    });
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all services
// @route   GET /api/services
// @access  Public
export const getServices = async (req, res) => {
  try {
    const { sporti, type } = req.query;
    
    let filter = {};
    if (sporti) filter.sporti = sporti;
    if (type) filter.type = type;
    
    const services = await Service.find(filter);
    
    res.json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get available services with date check
// @route   GET /api/services/available
// @access  Public
export const getAvailableServices = async (req, res) => {
  try {
    const { sporti, type, checkIn, checkOut } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'Check-in and check-out dates are required' });
    }
    
    // Parse dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Find all services matching criteria
    let filter = {};
    if (sporti) filter.sporti = sporti;
    if (type) filter.type = type;
    
    const services = await Service.find(filter);
    
    // Find bookings that overlap with the requested dates
    const bookings = await Booking.find({
      bookingType: 'service',
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
      ]
    }).select('serviceId');
    
    // Get array of booked service IDs
    const bookedServiceIds = bookings.map(booking => booking.serviceId.toString());
    
    // Filter out booked services
    const availableServices = services.filter(service => !bookedServiceIds.includes(service._id.toString()));
    
    res.json({
      success: true,
      count: availableServices.length,
      services: availableServices
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single service
// @route   GET /api/services/:id
// @access  Public
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    res.json({
      success: true,
      service
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Admin
export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    // Update service
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Service updated successfully',
      service: updatedService
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Toggle service availability
// @route   PUT /api/services/:id/toggle
// @access  Admin
export const toggleServiceAvailability = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    service.isAvailable = !service.isAvailable;
    await service.save();
    
    res.json({
      success: true,
      message: `Service ${service.isAvailable ? 'enabled' : 'disabled'} successfully`,
      service
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Seed service data
// @route   POST /api/services/seed
// @access  Admin
export const seedServices = async (req, res) => {
  try {
    const services = [
      {
        name: 'Main Function Hall',
        type: 'Main Function Hall',
        sporti: 'SPORTI-1',
        capacity: 200,
        price: {
          member: 5000,
          guest: 8000
        },
        description: 'Large function hall for events and celebrations',
        facilities: ['Sound System', 'Projector', 'Catering Area', 'Air Conditioning']
      },
      {
        name: 'Conference Room',
        type: 'Conference Room',
        sporti: 'SPORTI-1',
        capacity: 50,
        price: {
          member: 2000,
          guest: 3500
        },
        description: 'Professional conference room for meetings',
        facilities: ['Projector', 'Video Conferencing', 'Whiteboard', 'Air Conditioning']
      },
      {
        name: 'Barbeque Area',
        type: 'Barbeque Area',
        sporti: 'SPORTI-1',
        capacity: 30,
        price: {
          member: 1500,
          guest: 2500
        },
        description: 'Outdoor barbeque area for small gatherings',
        facilities: ['Barbeque Equipment', 'Seating Area', 'Lighting']
      },
      {
        name: 'Conference Room',
        type: 'Conference Room',
        sporti: 'SPORTI-2',
        capacity: 40,
        price: {
          member: 1800,
          guest: 3000
        },
        description: 'Modern conference room for meetings',
        facilities: ['Projector', 'Video Conferencing', 'Whiteboard', 'Air Conditioning']
      },
      {
        name: 'Training Room',
        type: 'Training Room',
        sporti: 'SPORTI-2',
        capacity: 60,
        price: {
          member: 2500,
          guest: 4000
        },
        description: 'Spacious training room for workshops and seminars',
        facilities: ['Projector', 'Sound System', 'Whiteboard', 'Air Conditioning', 'Flexible Seating']
      }
    ];
    
    // Remove existing services
    await Service.deleteMany({});
    
    // Insert new services
    const createdServices = await Service.insertMany(services);
    
    res.status(201).json({
      success: true,
      message: 'Services seeded successfully',
      count: createdServices.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export default {
  createService,
  getServices,
  getAvailableServices,
  getServiceById,
  updateService,
  toggleServiceAvailability,
  seedServices
};