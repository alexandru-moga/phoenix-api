const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const { sendLoginCode } = require('../utils/mailer');

// Helper: Validate email format
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Generate stateless login code
function generateLoginCode(email) {
  return speakeasy.totp({
    secret: process.env.SIMPLE_LOGIN_SECRET + email,
    encoding: 'ascii',
    step: 300, // 5 minutes
    digits: 6,
  });
}

// Verify stateless login code
function verifyLoginCode(email, code) {
  return speakeasy.totp.verify({
    secret: process.env.SIMPLE_LOGIN_SECRET + email,
    encoding: 'ascii',
    token: code,
    step: 300, // 5 minutes
    window: 1, // allow ±5min for clock skew
  });
}

// POST /api/auth/initiate-login
router.post('/initiate-login', async (req, res) => {
  const { email } = req.body;
  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }
  try {
    const code = generateLoginCode(email);
    await sendLoginCode(email, code);
    res.json({ success: true, message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Login initiation error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate login' });
  }
});

// POST /api/auth/verify-login
router.post('/verify-login', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || !validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'Valid email and code are required' });
  }
  try {
    if (!verifyLoginCode(email, code)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired code' });
    }
    // You may want to upsert the user here if not already in DB
    // Example: find or create user in your DB, get userId
    // const userId = await findOrCreateUser(email);

    // For demo, just use email as userId (replace with your logic)
    const userId = email;

    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ success: true, token, message: 'Login successful' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Login verification failed' });
  }
});

module.exports = router;
