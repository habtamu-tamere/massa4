const User = require('../models/User');

// Get all massagers
exports.getMassagers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find users with role 'massager'
    const massagers = await User.find({ role: 'massager' })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await User.countDocuments({ role: 'massager' });
    
    res.status(200).json({
      success: true,
      count: massagers.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: massagers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single massager
exports.getMassager = async (req, res) => {
  try {
    const massager = await User.findOne({
      _id: req.params.id,
      role: 'massager'
    });
    
    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: massager
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search massagers by specialty or location
exports.searchMassagers = async (req, res) => {
  try {
    const { specialty, location, page = 1, limit = 10 } = req.query;
    
    let query = { role: 'massager' };
    
    if (specialty) {
      query.services = { $in: [new RegExp(specialty, 'i')] };
    }
    
    if (location) {
      query.location = new RegExp(location, 'i');
    }
    
    const skip = (page - 1) * limit;
    
    const massagers = await User.find(query)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: massagers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: massagers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
