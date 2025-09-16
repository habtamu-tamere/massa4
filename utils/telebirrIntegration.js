const axios = require('axios');
const crypto = require('crypto');

// Telebirr payment integration
class TelebirrIntegration {
  constructor() {
    this.apiKey = process.env.TELEBIRR_API_KEY;
    this.apiSecret = process.env.TELEBIRR_API_SECRET;
    this.shortCode = process.env.TELEBIRR_SHORT_CODE;
    this.baseURL = 'https://api.telebirr.com/v1'; // Replace with actual Telebirr API URL
  }

  // Generate signature for request
  generateSignature(params) {
    const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return crypto.createHmac('sha256', this.apiSecret).update(sortedParams).digest('hex');
  }

  // Initialize payment
  async initializePayment(amount, phone, transactionId, description) {
    try {
      const params = {
        apiKey: this.apiKey,
        shortCode: this.shortCode,
        amount: amount.toString(),
        phone: phone,
        transactionId: transactionId,
        description: description,
        timestamp: Date.now().toString()
      };

      params.signature = this.generateSignature(params);

      const response = await axios.post(`${this.baseURL}/payment/initiate`, params, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Telebirr payment initialization error:', error);
      throw new Error('Payment initialization failed');
    }
  }

  // Verify payment
  async verifyPayment(transactionId) {
    try {
      const params = {
        apiKey: this.apiKey,
        transactionId: transactionId,
        timestamp: Date.now().toString()
      };

      params.signature = this.generateSignature(params);

      const response = await axios.post(`${this.baseURL}/payment/verify`, params, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Telebirr payment verification error:', error);
      throw new Error('Payment verification failed');
    }
  }

  // Process payment webhook
  processWebhook(payload, signature) {
    // Verify webhook signature
    const calculatedSignature = this.generateSignature(payload);
    
    if (calculatedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    // Process the webhook payload
    const { transactionId, status, amount } = payload;
    
    return {
      transactionId,
      status,
      amount
    };
  }
}

module.exports = new TelebirrIntegration();