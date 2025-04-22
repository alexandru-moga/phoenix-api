const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const { sendLoginCode } = require('../utils/mailer');
const authenticateJWT = require('../utils/auth');

// Enhanced email validation helper
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  
  const [localPart, domain] = email.split('@');
  const domainParts = domain.split('.');
  
  // Validate length constraints
  if (email.length > 254) return false;
  if (localPart.length > 64) return false;
  
  // Validate domain parts
  return domainParts.every(part => {
    const partRegex = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)$/;
    return partRegex.test(part);
  });
}

// Email validation middleware
const emailValidator = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required'
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address format',
      details: {
        example: 'user@example.com',
        requirements: [
          'Must contain @ symbol',
          'Valid domain structure',
          'No spaces or special characters'
        ]
      }
    });
  }

  next();
};

// Generate TOTP code
function generateLoginCode(email) {
  return speakeasy.totp({
    secret: process.env.SIMPLE_LOGIN_SECRET + email,
    encoding: 'ascii',
    step: 300, // 5 minutes
    digits: 6
  });
}

// Verify TOTP code
function verifyLoginCode(email, code) {
  return speakeasy.totp.verify({
    secret: process.env.SIMPLE_LOGIN_SECRET + email,
    encoding: 'ascii',
    token: code,
    step: 300,
    window: 1
  });
}

// Routes
router.post('/initiate-login', emailValidator, async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const code = generateLoginCode(normalizedEmail);
    await sendLoginCode(normalizedEmail, code);

    res.json({
      success: true,
      message: 'Verification code sent',
      details: {
        codeExpiresIn: '5 minutes',
        deliveryMethod: 'email'
      }
    });
  } catch (error) {
    console.error('Login initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate login',
      systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/verify-login', emailValidator, async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (!verifyLoginCode(normalizedEmail, code)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired verification code',
        recoverySteps: ['Request new code', 'Check email spam folder']
      });
    }

    const token = jwt.sign(
      { userId: normalizedEmail },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Authentication successful',
      user: {
        email: normalizedEmail,
        tokenExpiresIn: '1 hour'
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Login verification failed',
      systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/me', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    user: {
      email: req.user.userId,
      authenticatedAt: new Date(req.user.iat * 1000).toISOString(),
      tokenExpiresAt: new Date(req.user.exp * 1000).toISOString()
    }
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  res.json({ 
    success: true, 
    message: 'Successfully logged out',
    nextSteps: ['Clear client-side storage', 'Redirect to login']
  });
});

module.exports = router;