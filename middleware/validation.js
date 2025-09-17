const validatePhone = (phone) => {
  const regex = /^\+251\d{9}$/;
  return regex.test(phone);
};

const validateBooking = (req, res, next) => {
  const { date, time } = req.body;
  
  if (!date || !time) {
    return res.status(400).json({
      success: false,
      message: 'Please provide date and time for booking'
    });
  }
  
  const bookingDate = new Date(date);
  const now = new Date();
  
  if (bookingDate < now) {
    return res.status(400).json({
      success: false,
      message: 'Booking date cannot be in the past'
    });
  }
  
  next();
};

module.exports = { validatePhone, validateBooking };
