// routes/protectedRoutes.js
const express = require('express');
const router = express.Router();
const authenticateJWT = require('../utils/auth');

// Example protected route
router.get('/user', authenticateJWT, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.userId });
});

module.exports = router;
