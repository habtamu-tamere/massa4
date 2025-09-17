const axios = require('axios');
const crypto = require('crypto');

class Telebirr {
  constructor() {
    this.merchantId = process.env.TELEBIRR_MERCHANT_ID;
    this.publicKey = process.env.TELEBIRR_PUBLIC_KEY;
    this.privateKey = process.env.TELEBIRR_PRIVATE_KEY;
    this.apiUrl = process.env.TELEBIRR_API_URL;
  }

  // Generate signature for request
  generateSignature(data) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  // Verify signature from response
  verifySignature(data, signature) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(this.publicKey, signature, 'base64');
  }

  // Initiate payment
  async initiatePayment(paymentData) {
    try {
      const { amount, phone, bookingId, callbackUrl } = paymentData;
      
      const requestData = {
        merchantId: this.merchantId,
        amount: amount.toString(),
        phone: phone,
        transactionId: bookingId,
        callbackUrl: callbackUrl || `${process.env.BASE_URL}/api/payment/callback`,
        timestamp: Date.now().toString()
      };
      
      const jsonData = JSON.stringify(requestData);
      const signature = this.generateSignature(jsonData);
      
      const response = await axios.post(`${this.apiUrl}/payment/initiate`, {
        data: jsonData,
        signature: signature
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        return {
          success: true,
          paymentUrl: response.data.paymentUrl,
          transactionId: response.data.transactionId
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      console.error('Telebirr payment error:', error);
      return {
        success: false,
        message: 'Payment initiation failed'
      };
    }
  }

  // Verify payment
  async verifyPayment(transactionId) {
    try {
      const requestData = {
        merchantId: this.merchantId,
        transactionId: transactionId,
        timestamp: Date.now().toString()
      };
      
      const jsonData = JSON.stringify(requestData);
      const signature = this.generateSignature(jsonData);
      
      const response = await axios.post(`${this.apiUrl}/payment/verify`, {
        data: jsonData,
        signature: signature
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        return {
          success: true,
          status: response.data.status,
          transactionData: response.data.data
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      console.error('Telebirr verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed'
      };
    }
  }
}

module.exports = Telebirr;
