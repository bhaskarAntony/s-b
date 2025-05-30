import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Standard', 'VIP', 'Family']
  },
  floor: {
    type: String,
    required: true
  },
  sporti: {
    type: String,
    required: true,
    enum: ['SPORTI-1', 'SPORTI-2']
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  price: {
    member: {
      type: Number,
      required: true
    },
    guest: {
      type: Number,
      required: true
    }
  },
  facilities: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    default: ''
  },
  checkInDate: {
    type: Date,
    default: null
  },
  checkOutDate: {
    type: Date,
    default: null
  },
}, {
  timestamps: true
});

export default mongoose.model('Room', RoomSchema);