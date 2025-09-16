const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const telebirr = require('../utils/telebirr');

// Initiate Telebirr payment
const initiatePayment = async (req, res) => {
  try {
    const { bookingId, phoneNumber } = req.body;

    // Find booking
    const booking = await Booking.findById(bookingId)
      .populate('client', 'name phone')
      .populate('massager', 'name');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking is already paid' });
    }

    // Generate transaction ID
    const transactionId = `DIMPLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initiate payment with Telebirr
    const paymentResult = await telebirr.initiatePayment(
      booking.totalAmount,
      phoneNumber,
      transactionId,
      `Payment for massage session with ${booking.massager.name}`
    );

    // Create payment record
    const payment = await Payment.create({
      booking: bookingId,
      client: req.user._id,
      amount: booking.totalAmount,
      transactionId,
      telebirrResponse: paymentResult
    });

    // Update booking payment status
    booking.paymentStatus = 'pending';
    await booking.save();

    res.json({
      paymentId: payment._id,
      transactionId,
      paymentResult
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check payment status
const checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Find payment
    const payment = await Payment.findOne({ transactionId })
      .populate('booking')
      .populate('client');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user owns this payment
    if (payment.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check payment status with Telebirr
    const statusResult = await telebirr.checkPaymentStatus(transactionId);

    // Update payment status
    payment.status = statusResult.status;
    payment.telebirrResponse = { ...payment.telebirrResponse, statusCheck: statusResult };
    await payment.save();

    // Update booking payment status if payment is successful
    if (statusResult.status === 'success') {
      const booking = await Booking.findById(payment.booking._id);
      booking.paymentStatus = 'paid';
      await booking.save();
    }

    res.json({
      paymentStatus: payment.status,
      bookingStatus: payment.booking.status,
      statusResult
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Payment callback (for Telebirr webhook)
const paymentCallback = async (req, res) => {
  try {
    const { transactionId, status } = req.body;

    // Find payment
    const payment = await Payment.findOne({ transactionId })
      .populate('booking');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status
    payment.status = status;
    payment.telebirrResponse = { ...payment.telebirrResponse, callback: req.body };
    await payment.save();

    // Update booking payment status if payment is successful
    if (status === 'success') {
      const booking = await Booking.findById(payment.booking._id);
      booking.paymentStatus = 'paid';
      await booking.save();
    }

    res.json({ message: 'Callback processed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initiatePayment,
  checkPaymentStatus,
  paymentCallback
};
