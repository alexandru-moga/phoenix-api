const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

// Submit a new application
router.post('/submit', applicationController.submitApplication);

// Get all applications
router.get('/', applicationController.getAllApplications);

module.exports = router;
