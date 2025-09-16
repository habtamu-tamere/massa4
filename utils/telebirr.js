const crypto = require('crypto');
const axios = require('axios');

// Telebirr payment integration utility
class Telebirr {
  constructor() {
    this.shortCode = process.env.TELEBIRR_SHORT_CODE;
    this.publicKey = process.env.TELEBIRR_PUBLIC_KEY;
    this.privateKey = process.env.TELEBIRR_PRIVATE_KEY;
    this.apiUrl = process.env.TELEBIRR_API_URL;
  }

  // Generate HMAC signature
  generateSignature(data) {
    const hmac = crypto.createHmac('sha256', this.privateKey);
    hmac.update(data);
    return hmac.digest('hex');
  }

  // Initiate payment
  async initiatePayment(amount, phone, transactionId, description) {
    try {
      const payload = {
        shortCode: this.shortCode,
        amount: amount.toString(),
        phoneNumber: phone,
        transactionId,
        description,
        callbackUrl: `${process.env.FRONTEND_URL}/payment-callback`
      };

      const signature = this.generateSignature(JSON.stringify(payload));
      
      const response = await axios.post(`${this.apiUrl}/payment`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signature}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Telebirr payment error:', error);
      throw new Error('Payment initiation failed');
    }
  }

  // Check payment status
  async checkPaymentStatus(transactionId) {
    try {
      const payload = {
        shortCode: this.shortCode,
        transactionId
      };

      const signature = this.generateSignature(JSON.stringify(payload));
      
      const response = await axios.post(`${this.apiUrl}/payment/status`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signature}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Telebirr status check error:', error);
      throw new Error('Payment status check failed');
    }
  }
}

module.exports = new Telebirr();
