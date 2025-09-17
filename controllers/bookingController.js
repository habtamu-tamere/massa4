const Booking = require('../models/Booking');
const User = require('../models/User');

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { massagerId, date, time, duration } = req.body;
    
    // Check if massager exists
    const massager = await User.findOne({
      _id: massagerId,
      role: 'massager'
    });
    
    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }
    
    // Calculate total price
    const totalPrice = massager.pricePerHour * duration;
    
    // Create booking
    const booking = await Booking.create({
      client: req.user.id,
      massager: massagerId,
      date,
      time,
      duration,
      totalPrice
    });
    
    // Populate the booking with massager details
    await booking.populate('massager', 'name services location rating');
    
    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user's bookings
exports.getUserBookings = async (req, res) => {
  try {
    let query;
    
    if (req.user.role === 'client') {
      query = { client: req.user.id };
    } else {
      query = { massager: req.user.id };
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const bookings = await Booking.find(query)
      .populate('client', 'name phone')
      .populate('massager', 'name services location rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Booking.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single booking
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('client', 'name phone')
      .populate('massager', 'name services location rating');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user is authorized to view this booking
    if (req.user.role === 'client' && booking.client._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }
    
    if (req.user.role === 'massager' && booking.massager._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user is authorized to update this booking
    if (req.user.role === 'client' && booking.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }
    
    if (req.user.role === 'massager' && booking.massager.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }
    
    booking.status = status;
    await booking.save();
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// Admin endpoint to confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    const booking = await Booking.findById(bookingId)
      .populate('client', 'name phone')
      .populate('massager', 'name phone services location');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Update booking status
    booking.status = 'payment_confirmed';
    booking.paymentStatus = 'paid';
    booking.paymentConfirmedBy = req.user.id;
    booking.paymentConfirmedAt = new Date();
    
    // Share massager contact with client
    await Notifications.sendMassagerContact(booking.client, booking.massager, booking);
    booking.massagerContactShared = true;
    
    await booking.save();
    
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Payment confirmed and massager contact shared with client'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all bookings with payment pending (for admin)
exports.getPendingPayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can access pending payments'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const bookings = await Booking.find({ status: 'payment_pending' })
      .populate('client', 'name phone')
      .populate('massager', 'name services location rating pricePerHour')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Booking.countDocuments({ status: 'payment_pending' });
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
