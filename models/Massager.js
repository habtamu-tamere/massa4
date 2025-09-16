const mongoose = require('mongoose');

const massagerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  specialties: [{
    type: String,
    required: true
  }],
  experience: {
    type: Number,
    default: 0
  },
  certification: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  serviceLocations: [{
    type: String
  }],
  serviceRadius: {
    type: Number, // in kilometers
    default: 10
  },
  basePrice: {
    type: Number,
    required: true
  },
  availability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    slots: [{
      startTime: String,
      endTime: String,
      available: {
        type: Boolean,
        default: true
      }
    }]
  }],
  photos: [{
    url: String,
    public_id: String
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  completedSessions: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for geospatial queries if needed for location-based services
// massagerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Massager', massagerSchema);