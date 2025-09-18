const axios = require('axios');

class Notifications {
  // Send notification to admin via Telegram using Bot API
  static async sendTelegramNotification(message) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID || process.env.ADMIN_TELEGRAM_USERNAME;
      
      if (!botToken) {
        console.error('Telegram bot token not configured');
        return false;
      }
      
      if (!chatId) {
        console.error('Telegram chat ID not configured');
        return false;
      }
      
      // Format message with proper formatting
      const formattedMessage = this.formatTelegramMessage(message);
      
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      
      console.log('Telegram notification sent successfully:', response.data);
      return true;
    } catch (error) {
      console.error('Telegram notification error:', error.response?.data || error.message);
      return false;
    }
  }

  // Format message for Telegram with HTML formatting
  static formatTelegramMessage(message) {
    // Convert basic markdown to HTML for Telegram
    return message
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
      .replace(/\*(.*?)\*/g, '<i>$1</i>')     // Italic
      .replace(/_(.*?)_/g, '<i>$1</i>')       // Italic (alternative)
      .replace(/```(.*?)```/gs, '<pre>$1</pre>') // Code block
      .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
      .replace(/\n/g, '\n');                  // Keep line breaks
  }

  // Send notification to admin via WhatsApp using Twilio API
  static async sendWhatsAppNotification(message) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_WHATSAPP_PHONE;
      const adminWhatsAppNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      
      if (!accountSid || !authToken || !twilioPhone) {
        console.error('Twilio credentials not configured');
        return false;
      }
      
      if (!adminWhatsAppNumber) {
        console.error('Admin WhatsApp number not configured');
        return false;
      }
      
      // Format the phone numbers for Twilio
      const from = `whatsapp:${twilioPhone}`;
      const to = `whatsapp:${adminWhatsAppNumber}`;
      
      // Create Twilio client
      const client = require('twilio')(accountSid, authToken);
      
      const response = await client.messages.create({
        body: message,
        from: from,
        to: to
      });
      
      console.log('WhatsApp notification sent successfully. SID:', response.sid);
      return true;
    } catch (error) {
      console.error('WhatsApp notification error:', error.message);
      return false;
    }
  }

  // Alternative WhatsApp implementation using WhatsApp Business API
  static async sendWhatsAppNotificationAlternative(message) {
    try {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const adminWhatsAppNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      
      if (!accessToken || !phoneNumberId) {
        console.error('WhatsApp Business API credentials not configured');
        return false;
      }
      
      if (!adminWhatsAppNumber) {
        console.error('Admin WhatsApp number not configured');
        return false;
      }
      
      // Format the admin phone number (remove + and any non-digit characters)
      const formattedNumber = adminWhatsAppNumber.replace(/\D/g, '');
      
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('WhatsApp Business API notification sent successfully:', response.data);
      return true;
    } catch (error) {
      console.error('WhatsApp Business API notification error:', error.response?.data || error.message);
      return false;
    }
  }

  // Send SMS notification as fallback (using Twilio)
  static async sendSMSNotification(phoneNumber, message) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      
      if (!accountSid || !authToken || !twilioPhone) {
        console.error('Twilio credentials not configured for SMS');
        return false;
      }
      
      const client = require('twilio')(accountSid, authToken);
      
      const response = await client.messages.create({
        body: message,
        from: twilioPhone,
        to: phoneNumber
      });
      
      console.log('SMS notification sent successfully. SID:', response.sid);
      return true;
    } catch (error) {
      console.error('SMS notification error:', error.message);
      return false;
    }
  }

  // Send payment confirmation notification to admin
  static async sendPaymentNotification(booking, client, massager) {
    const message = `💰 *NEW PAYMENT REQUEST* 💰

*Booking ID:* ${booking._id}
*Client:* ${client.name} (${client.phone})
*Massager:* ${massager.name}
*Amount:* ${booking.totalPrice} ETB
*Date:* ${new Date(booking.date).toLocaleDateString()}
*Time:* ${booking.time}
*Duration:* ${booking.duration} hour(s)

*Please confirm payment received to:* +251962109562

*Client Message:*
"Hello, I have sent ${booking.totalPrice} ETB via Telebirr for my massage booking with ${massager.name} on ${new Date(booking.date).toLocaleDateString()} at ${booking.time}. Please confirm and share the massager's contact details."

*Instructions:*
1. Check Telebirr account +251962109562 for payment
2. Confirm payment received
3. Update booking status to "payment_confirmed"
4. System will automatically share massager contact with client`;

    // Try Telegram first, then WhatsApp, then SMS as fallback
    let sent = await this.sendTelegramNotification(message);
    
    if (!sent) {
      console.log('Telegram failed, trying WhatsApp...');
      sent = await this.sendWhatsAppNotification(message);
    }
    
    if (!sent) {
      console.log('WhatsApp failed, trying alternative method...');
      sent = await this.sendWhatsAppNotificationAlternative(message);
    }
    
    if (!sent) {
      console.log('All messaging failed, trying SMS as last resort...');
      const adminPhone = process.env.ADMIN_PHONE_NUMBER;
      if (adminPhone) {
        await this.sendSMSNotification(adminPhone, 
          `Dimple Payment: ${client.name} paid ${booking.totalPrice} ETB for ${massager.name}. Check Telebirr: +251962109562`
        );
      }
    }
    
    return sent;
  }

  // Send massager contact to client
  static async sendMassagerContact(client, massager, booking) {
    try {
      const message = `📞 *MASSAGER CONTACT INFORMATION* 📞

*Massager Details:*
• *Name:* ${massager.name}
• *Phone:* ${massager.phone}
• *Specialty:* ${massager.services.join(', ')}
• *Rating:* ${massager.rating} ⭐ (${massager.totalRatings} reviews)
• *Location:* ${massager.location}

*Booking Details:*
• *Date:* ${new Date(booking.date).toLocaleDateString()}
• *Time:* ${booking.time}
• *Duration:* ${booking.duration} hour(s)
• *Total Paid:* ${booking.totalPrice} ETB

*Important Notes:*
• Please arrive 10 minutes early
• Bring any special requirements
• Contact the massager if you need to reschedule
• Enjoy your massage! 💆‍♀️`;

      // Send to client via SMS (most reliable for Ethiopia)
      const smsSent = await this.sendSMSNotification(client.phone, 
        `Dimple: Your massager is ${massager.name} (${massager.phone}). Booking: ${new Date(booking.date).toLocaleDateString()} at ${booking.time}. Paid: ${booking.totalPrice} ETB.`
      );
      
      // Also try WhatsApp if available
      if (process.env.TWILIO_WHATSAPP_PHONE) {
        await this.sendWhatsAppNotification(client.phone, message);
      }
      
      return smsSent;
    } catch (error) {
      console.error('Error sending massager contact:', error);
      return false;
    }
  }

  // Send booking confirmation to client
  static async sendBookingConfirmation(client, massager, booking) {
    try {
      const message = `✅ *BOOKING CONFIRMED* ✅

Thank you for your booking with Dimple!

*Massager:* ${massager.name}
*Date:* ${new Date(booking.date).toLocaleDateString()}
*Time:* ${booking.time}
*Duration:* ${booking.duration} hour(s)
*Total:* ${booking.totalPrice} ETB

*Payment Instructions:*
Please send ${booking.totalPrice} ETB to Telebirr number: +251962109562

*Reference:* Booking #${booking._id}

After payment, our admin will verify and share the massager's contact details with you within 24 hours.`;

      await this.sendSMSNotification(client.phone, 
        `Dimple: Booking confirmed with ${massager.name} on ${new Date(booking.date).toLocaleDateString()} at ${booking.time}. Please pay ${booking.totalPrice} ETB to +251962109562`
      );
      
      return true;
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      return false;
    }
  }
}

module.exports = Notifications;