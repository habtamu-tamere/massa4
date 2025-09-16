const express = require('express');
const {
  getMassagers,
  getMassager,
  getAvailability,
  createUpdateProfile,
  uploadPhotos
} = require('../controllers/massagerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', getMassagers);
router.get('/:id', getMassager);
router.get('/:id/availability', getAvailability);

// Protected routes
router.post('/profile', protect, authorize('massager'), createUpdateProfile);
router.put('/profile/photos', protect, authorize('massager'), upload.array('photos', 5), uploadPhotos);

module.exports = router;