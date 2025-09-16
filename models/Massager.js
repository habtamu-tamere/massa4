const mongoose = require('mongoose');

const massagerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  services: {
    type: [String],
    required: true
  },
  specialties: [String],
  experience: Number, // in years
  certification: String,
  about: String,
  images: [String],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Massager', massagerSchema);
