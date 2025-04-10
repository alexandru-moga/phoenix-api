const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

async function sendLoginCode(email, code) {
  try {
    await transporter.sendMail({
      from: `Phoenix Club <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Phoenix Club Login Code',
      html: `
        <h1>Your Login Code: ${code}</h1>
        <p>This code will expire in 15 minutes.</p>
        <a href="${process.env.FRONTEND_URL}?code=${code}&email=${encodeURIComponent(email)}">
          Click here to login
        </a>
      `
    });
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

module.exports = { sendLoginCode };
