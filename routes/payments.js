const express = require('express');
const { initiatePayment, checkPaymentStatus, paymentCallback } = require('../controllers/paymentController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/telebirr/initiate', auth, initiatePayment);
router.get('/telebirr/status/:transactionId', auth, checkPaymentStatus);
router.post('/telebirr/callback', paymentCallback);

module.exports = router;
