const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendLoginCode } = require('../utils/mailer');
const jwt = require('jsonwebtoken');

// Register/Request Login Code
router.post('/register', async (req, res) => {
  const { email } = req.body;
  try {
    // Generate 6-digit code valid for 15 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Upsert member record
    await pool.query(
      `INSERT INTO members (email, login_code, login_code_expires)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       login_code = VALUES(login_code),
       login_code_expires = VALUES(login_code_expires)`,
      [email, code, expires]
    );

    // Send email
    await sendLoginCode(email, code);
    
    res.json({ success: true, message: 'Login code sent' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to send code' });
  }
});

// Verify Login Code
router.post('/login', async (req, res) => {
  const { email, code } = req.body;
  try {
    const [rows] = await pool.query(
      `INSERT INTO members (email, login_code, login_code_expires)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       login_code = VALUES(login_code),
       login_code_expires = VALUES(login_code_expires)`,
      [email, code, expires]
    );    

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid code' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Invalidate used code
    await pool.query(
      `UPDATE members SET login_code = NULL WHERE email = ?`,
      [email]
    );

    res.json({ 
      success: true, 
      token,
      projects: JSON.parse(rows[0].yswd_projects || '[]')
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

module.exports = router;
