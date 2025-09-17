const express = require('express');
const { createRating, getMassagerRatings } = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createRating);
router.get('/massager/:massagerId', getMassagerRatings);

module.exports = router;
