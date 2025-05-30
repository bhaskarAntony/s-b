import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'guest'],
    default: 'member'
  },
  referenceCode: {
    type: String,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  otp: { type: String },
  otpExpires: { type: Date },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Generate reference code before saving
UserSchema.pre('save', async function(next) {
  if (!this.referenceCode) {
    // Generate reference code from first 3 letters of name + random 4 digit number
    const namePrefix = this.name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.referenceCode = `${namePrefix}${randomNum}`;
  }
  
  // Hash password before saving
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to check password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('SporthjukhuygiUser', UserSchema);