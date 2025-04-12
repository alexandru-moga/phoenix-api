const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendLoginCode } = require('../utils/mailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

router.post('/initiate-login', async (req, res) => {
    const { email } = req.body;
    
    if (!validateEmail(email)) {
        return res.status(400).json({ 
            success: false,
            message: 'Valid email address is required'
        });
    }

    try {
        // Generate secure 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await pool.query(
            `INSERT INTO members (email, login_code, login_code_expires)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            login_code = VALUES(login_code),
            login_code_expires = VALUES(login_code_expires)`,
            [email, code, expiresAt]
        );

        await sendLoginCode(email, code);
        
        res.json({
            success: true,
            message: 'Verification code sent to email'
        });

    } catch (error) {
        console.error('Login initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate login'
        });
    }
});

router.post('/verify-login', async (req, res) => {
    const { email, code } = req.body;
    
    if (!email || !code || !validateEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Valid email and code are required'
        });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id 
            FROM members 
            WHERE email = ? 
            AND login_code = ? 
            AND login_code_expires > UTC_TIMESTAMP()`,
            [email, code]
        );

        if (!rows.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired code'
            });
        }

        const user = rows[0];
        
        // Invalidate used code
        await pool.query(
            `UPDATE members 
            SET login_code = NULL,
                login_code_expires = NULL 
            WHERE email = ?`,
            [email]
        );

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Login verification failed'
        });
    }
});

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = router;
