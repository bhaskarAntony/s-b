import mongoose from 'mongoose';
const guestBookingSchema = new mongoose.Schema({
  applicationNumber: { type: String, required: true, unique: true },
  bookingType: { type: String, enum: ['room'], default: 'room', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required:false },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  sporti: { type: String, required: true },
  roomType: { type: String, required: true },
  bookingFor: { type: String, required: true },
  relation: { type: String, required: true },
  totalCost: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'success', 'cancelled', 'completed'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  occupantDetails: {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    gender: { type: String, required: true },
    location: { type: String, required: true },
    // email: { type: String, required: true },
  },
  officerDetails: {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    designation: { type: String, required: true },
    // email: { type: String, required: true },
  },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('GuestBooking', guestBookingSchema);