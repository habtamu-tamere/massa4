const express = require('express');
const { createRating, getMassagerRatings } = require('../controllers/ratingController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, createRating);
router.get('/massager/:massagerId', getMassagerRatings);

module.exports = router;
