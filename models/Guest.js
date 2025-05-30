// import mongoose from 'mongoose';

// const GuestSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   email: {
//     type: String,
//     required: true
//   },
//   phoneNumber: {
//     type: String,
//     required: true
//   },
//   relationship: {
//     type: String,
//     required: true
//   },
//   gender: {
//     type: String,
//     required: true,
//     enum: ['Male', 'Female', 'Other']
//   },
//   age: {
//     type: Number,
//     required: true
//   },
//   referredBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected'],
//     default: 'pending'
//   }
// }, {
//   timestamps: true
// });

// export default mongoose.model('Guest', GuestSchema);


import mongoose from 'mongoose';

const GuestSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '1h', // Automatically delete guest data after 1 hour
  },
});

export default mongoose.model('Guest_sporti', GuestSchema);