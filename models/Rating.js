const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  massager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: String
}, {
  timestamps: true
});

// Update massager's average rating when a new rating is added
ratingSchema.post('save', async function() {
  const Rating = this.constructor;
  const massagerId = this.massager;
  
  const result = await Rating.aggregate([
    { $match: { massager: massagerId } },
    { $group: { _id: '$massager', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  
  if (result.length > 0) {
    await mongoose.model('User').findByIdAndUpdate(massagerId, {
      'rating.average': result[0].averageRating,
      'rating.count': result[0].count
    });
  }
});

module.exports = mongoose.model('Rating', ratingSchema);
