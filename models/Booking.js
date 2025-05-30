import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  bookingType: {
    type: String,
    required: true,
    enum: ['room', 'service']
  },
  bookingId: {
    type: String,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SporthjukhuygiUser',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  bookingFor: {
    type: String,
    enum: ['Self', 'Guest'],
    required: true
  },
  // guestId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Guest'
  // },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  occupantDetails:{
    type:Object,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  relation: {
    type: String,
    enum: ['Self', 'Spouse', 'Children', 'Batchmate', 'Friend', 'Relative', 'Acquaintance'],
    required: true,
  },
  applicationNo: {
    type: String
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

// Generate booking ID before saving
BookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    // Generate booking ID with SPT prefix + timestamp
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.bookingId = `SPT${timestamp}${randomChars}`;
  }
  
  // Generate application number for tracking
  if (!this.applicationNo) {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.applicationNo = `SPRT${dateStr}${random}`;
  }
  
  next();
});

export default mongoose.model('Booking', BookingSchema);

// import mongoose from 'mongoose';

// const OccupantSchema = new mongoose.Schema({
//   name: { type: String, required: true, trim: true },
//   phoneNumber: { type: String, required: true, match: [/^\d{10}$/, 'Invalid phone number'] },
//   gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
//   location: { type: String, required: true, trim: true },
//   relation: {
//     type: String,
//     enum: ['Self', 'Spouse', 'Children', 'Parents', 'Batchmate', 'Friend', 'Relative', 'Acquaintance'],
//     required: true,
//   },
// });

// const BookingSchema = new mongoose.Schema({
//   bookingType: {
//     type: String,
//     required: true,
//     enum: ['room', 'service'],
//   },
//   bookingId: {
//     type: String,
//     unique: true,
//   },
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: false,
//   },
//   officerDetails: {
//     name: { type: String, trim: true },
//     designation: { type: String, trim: true },
//     gender: { type: String, enum: ['Male', 'Female', 'Other'] },
//     phoneNumber: { type: String, match: [/^\d{10}$/, 'Invalid phone number'] },
//   },
//   roomIds: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Room',
//   }],
//   occupants: [OccupantSchema],
//   serviceId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Service',
//   },
//   bookingFor: {
//     type: String,
//     enum: ['Self', 'Guest'],
//     required: true,
//   },
//   checkIn: {
//     type: Date,
//     required: true,
//   },
//   checkOut: {
//     type: Date,
//     required: true,
//   },
//   totalCost: {
//     type: Number,
//     required: true,
//     min: 0,
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
//     default: 'pending',
//   },
//   paymentStatus: {
//     type: String,
//     enum: ['pending', 'paid'],
//     default: 'pending',
//   },
//   sporti: {
//     type: String,
//     required: true,
//     enum: ['SPORTI-1', 'SPORTI-2'],
//   },
//   roomType: {
//     type: String,
//     required: true,
//     enum: ['Standard', 'VIP', 'Family'],
//   },
//   remarks: {
//     type: String,
//     trim: true,
//   },
// }, {
//   timestamps: true,
//   indexes: [
//     { key: { bookingId: 1 }, unique: true },
//     { key: { checkIn: 1, checkOut: 1 } },
//     { key: { roomIds: 1 } },
//   ],
// });

// BookingSchema.pre('save', function (next) {
//   if (!this.bookingId) {
//     const timestamp = new Date().getTime().toString().slice(-6);
//     const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
//     this.bookingId = `SPT${timestamp}${randomChars}`;
//   }

//   next();
// });

// export default mongoose.model('Booking', BookingSchema);