const Rating = require('../models/Rating');
const Booking = require('../models/Booking');

// Create rating
const createRating = async (req, res) => {
  try {
    const { booking, rating, review } = req.body;

    // Check if booking exists
    const bookingDoc = await Booking.findById(booking)
      .populate('client')
      .populate('massager');

    if (!bookingDoc) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (bookingDoc.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking is completed
    if (bookingDoc.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed bookings' });
    }

    // Check if rating already exists for this booking
    const existingRating = await Rating.findOne({ booking });
    if (existingRating) {
      return res.status(400).json({ message: 'Rating already exists for this booking' });
    }

    // Create rating
    const newRating = await Rating.create({
      booking,
      client: req.user._id,
      massager: bookingDoc.massager._id,
      rating,
      review
    });

    res.status(201).json(newRating);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ratings for a massager
const getMassagerRatings = async (req, res) => {
  try {
    const { massagerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({ massager: massagerId })
      .populate('client', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Rating.countDocuments({ massager: massagerId });

    res.json({
      data: ratings,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRating,
  getMassagerRatings
};
