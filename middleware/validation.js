const validatePhone = (phone) => {
  const ethiopianPhoneRegex = /^(\+251|0)(9|7)[0-9]{8}$/;
  return ethiopianPhoneRegex.test(phone);
};

const validateBooking = (req, res, next) => {
  const { date, startTime, duration } = req.body;
  
  if (!date || !startTime) {
    return res.status(400).json({ message: 'Date and time are required' });
  }
  
  const bookingDate = new Date(date);
  if (bookingDate < new Date()) {
    return res.status(400).json({ message: 'Cannot book for past dates' });
  }
  
  if (duration && (duration < 0.5 || duration > 8)) {
    return res.status(400).json({ message: 'Duration must be between 0.5 and 8 hours' });
  }
  
  next();
};

module.exports = {
  validatePhone,
  validateBooking
};
