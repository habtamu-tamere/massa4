const Rating = require('../models/Rating');
const Booking = require('../models/Booking');

// Create a rating
exports.createRating = async (req, res) => {
  try {
    const { bookingId, rating, review } = req.body;
    
    // Check if booking exists and is completed
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed bookings'
      });
    }
    
    // Check if user is the client of this booking
    if (booking.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this booking'
      });
    }
    
    // Check if rating already exists for this booking
    const existingRating = await Rating.findOne({ booking: bookingId });
    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this booking'
      });
    }
    
    // Create rating
    const newRating = await Rating.create({
      booking: bookingId,
      client: req.user.id,
      massager: booking.massager,
      rating,
      review
    });
    
    res.status(201).json({
      success: true,
      data: newRating
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get ratings for a massager
exports.getMassagerRatings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const ratings = await Rating.find({ massager: req.params.massagerId })
      .populate('client', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Rating.countDocuments({ massager: req.params.massagerId });
    
    res.status(200).json({
      success: true,
      count: ratings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: ratings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
