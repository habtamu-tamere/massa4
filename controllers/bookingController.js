const Booking = require('../models/Booking');
const User = require('../models/User');
const { validateBooking } = require('../middleware/validation');

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const { massager, date, startTime, duration, location } = req.body;
    
    // Validate input
    validateBooking(req, res, () => {});

    // Check if massager exists and is available
    const massagerUser = await User.findOne({ 
      _id: massager, 
      role: 'massager',
      isAvailable: true 
    });
    
    if (!massagerUser) {
      return res.status(404).json({ message: 'Massager not found or not available' });
    }

    // Calculate total amount
    const totalAmount = massagerUser.hourlyRate * (duration || 1);

    // Create booking
    const booking = await Booking.create({
      client: req.user._id,
      massager,
      date,
      startTime,
      duration: duration || 1,
      location,
      totalAmount
    });

    // Populate massager details
    await booking.populate('massager', 'name services rating');

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.user.role === 'client') {
      query.client = req.user._id;
    } else if (req.user.role === 'massager') {
      query.massager = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('client', 'name phone')
      .populate('massager', 'name services rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    res.json({
      data: bookings,
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

// Get single booking
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('client', 'name phone')
      .populate('massager', 'name services rating location');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to this booking
    if (req.user.role === 'client' && booking.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'massager' && booking.massager._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to update this booking
    if (req.user.role === 'client' && booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'massager' && booking.massager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    booking.status = status;
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBooking,
  updateBookingStatus
};
