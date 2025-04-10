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
      const loginUrl = `${process.env.WEBSITE_URL || 'https://phoenixclub.ro'}/login.html?email=${encodeURIComponent(email)}&code=${code}`;
      
      await transporter.sendMail({
          from: `Phoenix Club <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your Phoenix Club Login Code',
          html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                  <div style="text-align: center; margin-bottom: 20px;">
                      <img src="${process.env.WEBSITE_URL || 'https://phoenixclub.ro'}/logo.png" alt="Phoenix Club" style="max-width: 100px;">
                  </div>
                  <h2 style="color: #ec3750; text-align: center;">Your Login Code</h2>
                  <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
                  <p style="font-size: 16px; line-height: 1.5;">Your login code for Phoenix Club is:</p>
                  <div style="text-align: center; margin: 20px 0;">
                      <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 15px; background-color: #f7f7f7; border-radius: 5px;">${code}</div>
                  </div>
                  <p style="font-size: 16px; line-height: 1.5;">This code will expire in 15 minutes.</p>
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ec3750; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Click here to login</a>
                  </div>
                  <p style="font-size: 14px; color: #999; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
              </div>
          `
      });
  } catch (error) {
      console.error('Email send error:', error);
      throw error;
  }
}


module.exports = { sendLoginCode };
