const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

router.post('/submit', applicationController.submitApplication);

router.get('/', applicationController.getAllApplications);

module.exports = router;
