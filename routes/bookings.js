const express = require('express');
const { createBooking, getUserBookings, getBooking, updateBookingStatus } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const { validateBooking } = require('../middleware/validation');

const router = express.Router();

router.use(protect);

router.post('/', validateBooking, createBooking);
router.get('/', getUserBookings);
router.get('/:id', getBooking);
router.put('/:id/status', updateBookingStatus);

module.exports = router;
