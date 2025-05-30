import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Conference Room', 'Main Function Hall', 'Barbeque Area', 'Training Room']
  },
  sporti: {
    type: String,
    required: true,
    enum: ['SPORTI-1', 'SPORTI-2']
  },
  capacity: {
    type: Number,
    required: true
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
  isAvailable: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  },
  facilities: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model('Service', ServiceSchema);