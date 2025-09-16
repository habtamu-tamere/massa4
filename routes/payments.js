const express = require('express');
const {
  initializePayment,
  verifyPayment,
  telebirrWebhook,
  getPaymentHistory
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);

// Webhook (no authentication needed)
router.post('/webhook/telebirr', telebirrWebhook);

module.exports = router;