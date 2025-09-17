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
  review: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Update massager's average rating when a new rating is added
ratingSchema.post('save', async function() {
  const Rating = this.model('Rating');
  const User = this.model('User');
  
  const stats = await Rating.aggregate([
    {
      $match: { massager: this.massager }
    },
    {
      $group: {
        _id: '$massager',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await User.findByIdAndUpdate(this.massager, {
      rating: stats[0].avgRating,
      totalRatings: stats[0].nRating
    });
  }
});

module.exports = mongoose.model('Rating', ratingSchema);
