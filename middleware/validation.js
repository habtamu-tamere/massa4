const Joi = require('joi');

// Register validation
exports.registerValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^\+251[0-9]{9}$/).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('client', 'massager'),
    services: Joi.array().items(Joi.string()),
    gender: Joi.string().valid('male', 'female', 'other'),
    location: Joi.string(),
    availability: Joi.string()
  });

  return schema.validate(data);
};

// Login validation
exports.loginValidation = (data) => {
  const schema = Joi.object({
    phone: Joi.string().pattern(/^\+251[0-9]{9}$/).required(),
    password: Joi.string().min(6).required()
  });

  return schema.validate(data);
};

// Booking validation
exports.bookingValidation = (data) => {
  const schema = Joi.object({
    massagerId: Joi.string().required(),
    service: Joi.string().required(),
    date: Joi.date().greater('now').required(),
    startTime: Joi.string().required(),
    duration: Joi.number().min(30).max(240).required(), // 30min to 4 hours
    location: Joi.string().required(),
    specialRequests: Joi.string().max(300)
  });

  return schema.validate(data);
};

// Rating validation
exports.ratingValidation = (data) => {
  const schema = Joi.object({
    bookingId: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    review: Joi.string().max(500),
    isRecommended: Joi.boolean()
  });

  return schema.validate(data);
};