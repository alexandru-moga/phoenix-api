const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendLoginCode } = require('../utils/mailer');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
  const { email } = req.body;
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO members (email, login_code, login_code_expires)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       login_code = VALUES(login_code),
       login_code_expires = VALUES(login_code_expires)`,
      [email, code, expires]
    );

    await sendLoginCode(email, code);
    res.json({ success: true, message: 'Login code sent' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to send code' });
  }
});

router.post('/login', async (req, res) => {
  const { email, code } = req.body;
  
  try {
    const [rows] = await pool.query(
      `SELECT id, ysws_projects FROM members 
       WHERE email = ? 
       AND login_code = ?
       AND login_code_expires > NOW()`,
      [email, code]
    );

    // Add this check
    if (!rows || rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired code' 
      });
    }

    const user = rows[0];
    if (!user?.id) { // Additional check
      return res.status(500).json({ 
        success: false, 
        message: 'User ID not found' 
      });
    }

    const token = jwt.sign(
      { userId: user.id }, // Now safe
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await pool.query(
      `UPDATE members SET login_code = NULL WHERE email = ?`,
      [email]
    );

    res.json({ 
      success: true, 
      token,
      projects: JSON.parse(user.ysws_projects || '[]')
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

module.exports = router;
