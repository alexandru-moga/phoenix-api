const Contact = require('../models/contact');
const { sendContactToDiscord } = require('../utils/discord');

const contactController = {
  async submitContact(req, res) {
    try {
      const { name, email, message } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      const contactData = { name, email, message };
      const savedContact = await Contact.create(contactData);
      await sendContactToDiscord(contactData);

      return res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        contact: savedContact
      });
    } catch (error) {
      console.error('Contact submission error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  }
};

module.exports = contactController;
module.exports = router;