const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  massager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot be more than 500 characters']
  },
  isRecommended: {
    type: Boolean
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate reviews for the same booking
ratingSchema.index({ booking: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);