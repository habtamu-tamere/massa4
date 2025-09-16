const Booking = require('../models/Booking');
const telebirrIntegration = require('../utils/telebirrIntegration');

// @desc    Initialize payment for booking
// @route   POST /api/payments/initialize
// @access  Private
exports.initializePayment = async (req, res) => {
  try {
    const { bookingId, phone } = req.body;

    if (!bookingId || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide booking ID and phone number'
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this booking'
      });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
    }

    // Generate transaction ID
    const transactionId = `DIMPLE_${bookingId}_${Date.now()}`;

    // Initialize payment with Telebirr
    const paymentData = await telebirrIntegration.initializePayment(
      booking.totalAmount,
      phone,
      transactionId,
      `Payment for booking ${bookingId}`
    );

    // Update booking with transaction ID
    booking.transactionId = transactionId;
    await booking.save();

    res.status(200).json({
      success: true,
      data: paymentData
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment initialization failed'
    });
  }
};

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction ID'
      });
    }

    // Verify payment with Telebirr
    const verificationResult = await telebirrIntegration.verifyPayment(transactionId);

    // Find booking by transaction ID
    const booking = await Booking.findOne({ transactionId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found for this transaction'
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this payment'
      });
    }

    // Update booking payment status
    if (verificationResult.status === 'success') {
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed'; // Change booking status to confirmed
      await booking.save();
    }

    res.status(200).json({
      success: true,
      data: {
        verificationResult,
        booking
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

// @desc    Telebirr payment webhook
// @route   POST /api/payments/webhook/telebirr
// @access  Public (called by Telebirr)
exports.telebirrWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-telebirr-signature'];
    const payload = req.body;

    // Process webhook
    const webhookData = telebirrIntegration.processWebhook(payload, signature);

    // Find booking by transaction ID
    const booking = await Booking.findOne({ transactionId: webhookData.transactionId });

    if (booking) {
      // Update booking payment status based on webhook data
      if (webhookData.status === 'success') {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
      } else if (webhookData.status === 'failed') {
        booking.paymentStatus = 'failed';
      }

      await booking.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Telebirr webhook error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get payment history for user
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Find user's bookings with payments
    const bookings = await Booking.find({ 
      user: req.user.id,
      paymentStatus: { $in: ['paid', 'failed', 'refunded'] }
    })
    .select('date service totalAmount paymentStatus paymentMethod transactionId')
    .sort({ date: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('massager', 'name');

    const total = await Booking.countDocuments({ 
      user: req.user.id,
      paymentStatus: { $in: ['paid', 'failed', 'refunded'] }
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit)
      },
      data: bookings
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};