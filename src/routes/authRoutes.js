const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

authenticator.options = {
  digits: 6,
  step: 30,
  window: 1
};

router.post('/start-auth', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false,
      message: 'Email is required' 
    });
  }

  try {
    const [userRows] = await pool.query(
      'SELECT id, totp_secret FROM members WHERE email = ?',
      [email]
    );

    let user = userRows[0];
    let isNewSecret = false;

    if (!user || !user.totp_secret) {
      const newSecret = authenticator.generateSecret();
      isNewSecret = true;

      await pool.query(
        `INSERT INTO members (email, totp_secret)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
         totp_secret = VALUES(totp_secret)`,
        [email, newSecret]
      );

      user = { totp_secret: newSecret };
    }

    const otpauth = authenticator.keyuri(
      email,
      'Phoenix Club',
      user.totp_secret
    );

    const qrCode = await QRCode.toDataURL(otpauth);

    res.json({
      success: true,
      qrCode,
      manualCode: user.totp_secret,
      isNewSecret
    });

  } catch (error) {
    console.error('Auth setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize authentication'
    });
  }
});

router.post('/verify-totp', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: 'Email and code are required'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, totp_secret FROM members WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = rows[0];
    
    if (!user.totp_secret) {
      return res.status(403).json({
        success: false,
        message: '2FA not configured'
      });
    }

    const isValid = authenticator.check(code, user.totp_secret);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication code'
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code'
    });
  }
});

module.exports = router;