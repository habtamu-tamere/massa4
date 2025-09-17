const express = require('express');
const { getMassagers, getMassager, searchMassagers } = require('../controllers/massagerController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', getMassagers);
router.get('/search', searchMassagers);
router.get('/:id', getMassager);

module.exports = router;
