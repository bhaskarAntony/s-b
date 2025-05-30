import Room from './Room.js';
import Booking from './Booking.js';

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Admin
export const createRoom = async (req, res) => {
  try {
    const { roomNumber, category, floor, sporti, price, facilities, description } = req.body;
    
    // Check if room already exists
    const roomExists = await Room.findOne({ roomNumber, sporti });
    if (roomExists) {
      return res.status(400).json({ success: false, message: 'Room already exists' });
    }
    
    // Create room
    const room = await Room.create({
      roomNumber,
      category,
      floor,
      sporti,
      price,
      facilities,
      description
    });
    
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
export const getRooms = async (req, res) => {
  try {
    const { sporti, category } = req.query;
    
    let filter = {};
    if (sporti) filter.sporti = sporti;
    if (category) filter.category = category;
    
    const rooms = await Room.find(filter);
    
    res.json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get available rooms with date check
// @route   GET /api/rooms/available
// @access  Public
export const getAvailableRooms = async (req, res) => {
  try {
    const { sporti, category, checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'Check-in and check-out dates are required' });
    }

    // Parse dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Find all rooms matching criteria
    let filter = { isBlocked: false };
    if (sporti) filter.sporti = sporti;
    if (category) filter.category = category;

    const rooms = await Room.find(filter);

    // Find bookings that overlap with the requested dates
    const bookings = await Booking.find({
      bookingType: 'room',
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
      ]
    }).select('roomId');

    // Get array of booked room IDs, filtering out null roomId values
    const bookedRoomIds = bookings
      .filter(booking => booking.roomId !== null)
      .map(booking => booking.roomId.toString());

    // Filter out booked rooms
    const availableRooms = rooms.filter(room => !bookedRoomIds.includes(room._id.toString()));

    res.json({
      success: true,
      count: availableRooms.length,
      rooms: availableRooms
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single room
// @route   GET /api/rooms/:id
// @access  Public
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Admin
export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    // Update room details
    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Room updated successfully',
      room: updatedRoom
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Block/Unblock a room
// @route   PUT /api/rooms/:id/block
// @access  Admin
export const toggleRoomBlock = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    room.isBlocked = !room.isBlocked;
    await room.save();
    
    res.json({
      success: true,
      message: `Room ${room.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Seed rooms from roomData
// @route   POST /api/rooms/seed
// @access  Admin
export const seedRooms = async (req, res) => {
  try {
    // Define prices
    const prices = {
      Standard: { member: 1500, guest: 2000 },
      VIP: { member: 3000, guest: 3500 },
      Family: { member: 2000, guest: 2500 }
    };
    
    // Room data structure
    const roomData = {
      "SPORTI-1": {
        "GROUND FLOOR": {
          Standard: ["102", "103", "104", "105", "106"],
        },
        "FIRST FLOOR": {
          Standard: ["204", "205", "206", "207", "208", "209", "210", "211"],
          VIP: ["201", "202"],
          Family: ["203"],
        },
      },
      "SPORTI-2": {
        "GROUND FLOOR": {
          VIP: ["01", "02", "03"],
        },
        "FIRST FLOOR": {
          Standard: ["101", "102", "103", "104", "105", "106", "107", "108", "109", "110", "111", "112", "113", "114"],
        },
      },
    };
    
    const roomsToCreate = [];
    
    // Process room data
    Object.keys(roomData).forEach(sporti => {
      Object.keys(roomData[sporti]).forEach(floor => {
        Object.keys(roomData[sporti][floor]).forEach(category => {
          roomData[sporti][floor][category].forEach(roomNumber => {
            roomsToCreate.push({
              roomNumber,
              category,
              floor,
              sporti,
              price: prices[category],
              facilities: [
                'Air Conditioning',
                'TV',
                'Wi-Fi',
                'Attached Bathroom'
              ],
              description: `${category} room in ${sporti}, ${floor}`
            });
          });
        });
      });
    });
    
    // Insert rooms to database
    await Room.deleteMany({});
    const rooms = await Room.insertMany(roomsToCreate);
    
    res.status(201).json({
      success: true,
      message: 'Rooms seeded successfully',
      count: rooms.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export default {
  createRoom,
  getRooms,
  getAvailableRooms,
  getRoomById,
  updateRoom,
  toggleRoomBlock,
  seedRooms
};