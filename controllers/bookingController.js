const Booking = require('../models/Booking');
const User = require('../models/User');
const Massager = require('../models/Massager');
const { bookingValidation } = require('../middleware/validation');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    // Validate request body
    const { error } = bookingValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const {
      massagerId,
      service,
      date,
      startTime,
      duration,
      location,
      specialRequests
    } = req.body;

    // Check if massager exists and is verified
    const massager = await User.findById(massagerId)
      .where({ role: 'massager', isVerified: true });
    
    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }

    // Check if massager is available at the requested time
    const bookingDate = new Date(date);
    const isAvailable = await checkMassagerAvailability(massagerId, bookingDate, startTime, duration);
    
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Massager is not available at the requested time'
      });
    }

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    const endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

    // Get massager's base price
    const massagerProfile = await Massager.findOne({ user: massagerId });
    const basePrice = massagerProfile ? massagerProfile.basePrice : 500; // Default price
    
    // Calculate total amount (base price * duration in hours)
    const totalAmount = basePrice * (duration / 60);

    // Create booking
    const booking = await Booking.create({
      user: req.user.id,
      massager: massagerId,
      service,
      date: bookingDate,
      startTime,
      endTime,
      duration,
      location,
      totalAmount,
      specialRequests
    });

    // Populate massager details for response
    await booking.populate('massager', 'name phone');

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get all bookings for user
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    let query;
    
    // If user is a client, get their bookings
    if (req.user.role === 'client') {
      query = Booking.find({ user: req.user.id });
    } 
    // If user is a massager, get bookings for them
    else if (req.user.role === 'massager') {
      query = Booking.find({ massager: req.user.id });
    }
    // Admin can see all bookings
    else if (req.user.role === 'admin') {
      query = Booking.find();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access bookings'
      });
    }

    // Filter by status if provided
    if (req.query.status) {
      query = query.where('status').equals(req.query.status);
    }

    // Sort by date (newest first)
    query = query.sort({ createdAt: -1 });

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Booking.countDocuments(query);

    query = query.skip(startIndex).limit(limit);

    // Populate user/massager details
    if (req.user.role === 'client') {
      query = query.populate('massager', 'name phone');
    } else {
      query = query.populate('user', 'name phone');
    }

    const bookings = await query;

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit)
      },
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized to view this booking
    if (req.user.role !== 'admin' && 
        booking.user.toString() !== req.user.id && 
        booking.massager.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    // Populate user and massager details
    await booking.populate('user', 'name phone');
    await booking.populate('massager', 'name phone');

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;
    const allowedStatuses = ['confirmed', 'cancelled', 'rejected', 'in-progress', 'completed'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && booking.massager.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Update booking status
    booking.status = status;
    
    // Add cancellation reason if provided
    if (status === 'cancelled' && cancellationReason) {
      booking.cancellationReason = cancellationReason;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Helper function to check massager availability
async function checkMassagerAvailability(massagerId, date, startTime, duration) {
  // Get massager's availability from profile
  const massagerProfile = await Massager.findOne({ user: massagerId });
  
  if (!massagerProfile || !massagerProfile.availability) {
    return false;
  }

  // Get day of week
  const dayOfWeek = date.getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dayOfWeek];

  // Find availability for this day
  const dayAvailability = massagerProfile.availability.find(a => a.day === dayName);
  
  if (!dayAvailability) {
    return false;
  }

  // Calculate end time
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = startTotalMinutes + duration;
  
  // Check if the requested time slot is within available slots
  const isWithinAvailableSlot = dayAvailability.slots.some(slot => {
    if (!slot.available) return false;
    
    const [slotStartHours, slotStartMinutes] = slot.startTime.split(':').map(Number);
    const [slotEndHours, slotEndMinutes] = slot.endTime.split(':').map(Number);
    
    const slotStartTotalMinutes = slotStartHours * 60 + slotStartMinutes;
    const slotEndTotalMinutes = slotEndHours * 60 + slotEndMinutes;
    
    return startTotalMinutes >= slotStartTotalMinutes && 
           endTotalMinutes <= slotEndTotalMinutes;
  });

  if (!isWithinAvailableSlot) {
    return false;
  }

  // Check for existing bookings at the same time
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const conflictingBookings = await Booking.find({
    massager: massagerId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['confirmed', 'in-progress'] },
    $or: [
      {
        startTime: { $lt: startTime },
        endTime: { $gt: startTime }
      },
      {
        startTime: { $lt: calculateEndTime(startTime, duration) },
        endTime: { $gt: calculateEndTime(startTime, duration) }
      },
      {
        startTime: { $gte: startTime },
        endTime: { $lte: calculateEndTime(startTime, duration) }
      }
    ]
  });

  return conflictingBookings.length === 0;
}

// Helper function to calculate end time
function calculateEndTime(startTime, duration) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}