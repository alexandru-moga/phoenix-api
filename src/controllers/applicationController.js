const Application = require('../models/application');
const { sendApplicationToDiscord } = require('../utils/discord');

const applicationController = {
  async submitApplication(req, res) {
    try {
      // Validate request body exists
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Request body is missing'
        });
      }

      // Validate required fields
      const requiredFields = [
        'email', 'first_name', 'last_name', 'school', 
        'class', 'birthdate', 'phone', 'superpowers'
      ];
      
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Create application object
      const applicationData = {
        email: req.body.email,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        school: req.body.school,
        class: req.body.class,
        birthdate: req.body.birthdate,
        phone: req.body.phone,
        superpowers: req.body.superpowers
      };

      // Save to database
      const savedApplication = await Application.create(applicationData);
      
      // Send to Discord
      await sendApplicationToDiscord(applicationData);

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        application: savedApplication
      });
    } catch (error) {
      console.error('Error in submitApplication:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  },

  async getAllApplications(req, res) {
    try {
      const applications = await Application.getAll();
      return res.status(200).json({
        success: true,
        data: applications
      });
    } catch (error) {
      console.error('Error in getAllApplications:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve applications'
      });
    }
  }
};

module.exports = applicationController;