const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendLoginCode } = require('../utils/mailer');
const jwt = require('jsonwebtoken');

router.post('/send-code', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            success: false,
            message: 'Email is required'
        });
    }

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
        res.json({ 
            success: true,
            message: 'Login code sent to email'
        });
        
    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send code'
        });
    }
});

router.post('/verify-code', async (req, res) => {
    const { email, code } = req.body;
    
    if (!email || !code) {
        return res.status(400).json({ 
            success: false,
            message: 'Email and code are required'
        });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id, ysws_projects FROM members
            WHERE email = ?
            AND login_code = ?
            AND login_code_expires > NOW()`,
            [email, code]
        );

        if (!rows || rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired code'
            });
        }

        const user = rows[0];
        const token = jwt.sign(
            { userId: user.id },
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
        console.error('Verify code error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Verification failed'
        });
    }
});

module.exports = router;
