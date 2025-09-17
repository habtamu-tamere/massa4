const express = require('express');
const { getPendingPayments, confirmPayment } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes protected and only for admin
router.use(protect);
router.use(authorize('admin'));

router.get('/pending-payments', getPendingPayments);
router.post('/confirm-payment', confirmPayment);

module.exports = router;
