const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validatePhone } = require('../middleware/validation');

// Register user
const register = async (req, res) => {
  try {
    const { name, phone, password, role, services, gender, location, availability, hourlyRate } = req.body;

    // Validate phone number
    if (!validatePhone(phone)) {
      return res.status(400).json({ message: 'Please provide a valid Ethiopian phone number' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // Create user
    const user = await User.create({
      name,
      phone,
      password,
      role,
      services: role === 'massager' ? services : undefined,
      gender: role === 'massager' ? gender : undefined,
      location: role === 'massager' ? location : undefined,
      availability: role === 'massager' ? availability : undefined,
      hourlyRate: role === 'massager' ? hourlyRate : undefined
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid phone or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      role: req.user.role,
      services: req.user.services,
      gender: req.user.gender,
      location: req.user.location,
      availability: req.user.availability,
      hourlyRate: req.user.hourlyRate,
      rating: req.user.rating
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe
};
