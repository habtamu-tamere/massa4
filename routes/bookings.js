const express = require('express');
const { createBooking, getUserBookings, getBooking, updateBookingStatus } = require('../controllers/bookingController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, createBooking);
router.get('/', auth, getUserBookings);
router.get('/:id', auth, getBooking);
router.patch('/:id/status', auth, updateBookingStatus);

module.exports = router;
