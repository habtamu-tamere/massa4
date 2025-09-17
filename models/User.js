const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: 50
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^\+251\d{9}$/.test(v);
      },
      message: 'Phone number must be a valid Ethiopian number (+251...)'
    }
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['client', 'massager'],
    default: 'client'
  },
  services: {
    type: [String],
    required: function() {
      return this.role === 'massager';
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: function() {
      return this.role === 'massager';
    }
  },
  location: {
    type: String,
    required: function() {
      return this.role === 'massager';
    }
  },
  availability: {
    type: String,
    required: function() {
      return this.role === 'massager';
    }
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
