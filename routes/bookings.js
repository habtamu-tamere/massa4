const express = require('express');
const {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBooking);
router.put('/:id/status', updateBookingStatus);

module.exports = router;