const User = require('../models/User');

// Get all massagers with pagination
const getMassagers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find users with role 'massager'
    const massagers = await User.find({ role: 'massager', isAvailable: true })
      .select('-password')
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'massager', isAvailable: true });

    res.json({
      data: massagers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single massager
const getMassager = async (req, res) => {
  try {
    const massager = await User.findOne({ 
      _id: req.params.id, 
      role: 'massager' 
    }).select('-password');

    if (!massager) {
      return res.status(404).json({ message: 'Massager not found' });
    }

    res.json(massager);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search massagers by location or service
const searchMassagers = async (req, res) => {
  try {
    const { location, service } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { role: 'massager', isAvailable: true };

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (service) {
      query.services = { $in: [new RegExp(service, 'i')] };
    }

    const massagers = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      data: massagers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMassagers,
  getMassager,
  searchMassagers
};
