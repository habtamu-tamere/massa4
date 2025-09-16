const User = require('../models/User');
const Massager = require('../models/Massager');
const Booking = require('../models/Booking');
const Rating = require('../models/Rating');

// @desc    Get all massagers
// @route   GET /api/massagers
// @access  Public
exports.getMassagers = async (req, res) => {
  try {
    // Filtering, sorting, pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments({ role: 'massager', isVerified: true });

    // Build query
    let query = User.find({ role: 'massager', isVerified: true });

    // Filter by location
    if (req.query.location) {
      query = query.where('location').regex(new RegExp(req.query.location, 'i'));
    }

    // Filter by services
    if (req.query.services) {
      const servicesArray = req.query.services.split(',');
      query = query.where('services').in(servicesArray);
    }

    // Filter by gender
    if (req.query.gender) {
      query = query.where('gender').equals(req.query.gender);
    }

    // Filter by min rating
    if (req.query.minRating) {
      query = query.where('rating').gte(parseFloat(req.query.minRating));
    }

    // Execute query with pagination
    const massagers = await query
      .select('name phone services gender location availability rating totalRatings profileImage')
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: massagers.length,
      pagination,
      data: massagers
    });
  } catch (error) {
    console.error('Get massagers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single massager
// @route   GET /api/massagers/:id
// @access  Public
exports.getMassager = async (req, res) => {
  try {
    const massager = await User.findById(req.params.id)
      .where({ role: 'massager', isVerified: true })
      .select('-password');

    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }

    // Get massager profile details if available
    const massagerProfile = await Massager.findOne({ user: req.params.id });
    
    // Get recent reviews
    const reviews = await Rating.find({ massager: req.params.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        ...massager.toObject(),
        profile: massagerProfile,
        reviews
      }
    });
  } catch (error) {
    console.error('Get massager error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get massager availability
// @route   GET /api/massagers/:id/availability
// @access  Public
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const massagerId = req.params.id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a date'
      });
    }

    // Check if massager exists and is verified
    const massager = await User.findById(massagerId)
      .where({ role: 'massager', isVerified: true });
    
    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }

    // Get massager's availability from profile
    const massagerProfile = await Massager.findOne({ user: massagerId });
    
    if (!massagerProfile || !massagerProfile.availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not set for this massager'
      });
    }

    // Get booked slots for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      massager: massagerId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'in-progress'] }
    }).select('startTime endTime');

    // Convert booked slots to time strings for comparison
    const bookedSlots = bookings.map(booking => ({
      startTime: booking.startTime,
      endTime: booking.endTime
    }));

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = startOfDay.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayOfWeek];

    // Find availability for this day
    const dayAvailability = massagerProfile.availability.find(a => a.day === dayName);
    
    if (!dayAvailability) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          message: 'No availability for this day',
          slots: []
        }
      });
    }

    // Filter out booked slots
    const availableSlots = dayAvailability.slots
      .filter(slot => slot.available)
      .map(slot => {
        const isBooked = bookedSlots.some(booked => 
          booked.startTime === slot.startTime && booked.endTime === slot.endTime
        );
        
        return {
          ...slot,
          available: !isBooked
        };
      });

    res.status(200).json({
      success: true,
      data: {
        available: availableSlots.some(slot => slot.available),
        slots: availableSlots
      }
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create or update massager profile
// @route   POST /api/massagers/profile
// @access  Private (Massager only)
exports.createUpdateProfile = async (req, res) => {
  try {
    // Check if user is a massager
    if (req.user.role !== 'massager') {
      return res.status(403).json({
        success: false,
        message: 'Only massagers can create or update profiles'
      });
    }

    const {
      specialties,
      experience,
      certification,
      description,
      serviceLocations,
      serviceRadius,
      basePrice,
      availability
    } = req.body;

    // Build profile object
    const profileFields = {
      user: req.user.id,
      specialties,
      experience,
      certification,
      description,
      serviceLocations,
      serviceRadius,
      basePrice,
      availability
    };

    // Using upsert option (creates new doc if no match is found)
    let profile = await Massager.findOneAndUpdate(
      { user: req.user.id },
      { $set: profileFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Create/update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Upload massager photos
// @route   PUT /api/massagers/profile/photos
// @access  Private (Massager only)
exports.uploadPhotos = async (req, res) => {
  try {
    // Check if user is a massager
    if (req.user.role !== 'massager') {
      return res.status(403).json({
        success: false,
        message: 'Only massagers can upload photos'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one photo'
      });
    }

    // Prepare photos array with Cloudinary info
    const photos = req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));

    // Update massager profile with new photos
    const profile = await Massager.findOneAndUpdate(
      { user: req.user.id },
      { $push: { photos: { $each: photos } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: profile.photos
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};