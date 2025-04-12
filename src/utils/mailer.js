const nodemailer = require('nodemailer');

async function sendLoginCode(email, code) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const loginUrl = `${process.env.WEBSITE_URL}/login.html?email=${encodeURIComponent(email)}&code=${code}`;

    await transporter.sendMail({
        from: `Phoenix Club <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Phoenix Club Login Code',
        html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ec3750;">Your Login Code</h2>
                <p>Use this code to complete your login:</p>
                <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${code}
                </div>
                <p>Or click below to login automatically:</p>
                <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ec3750; color: white; text-decoration: none; border-radius: 4px;">
                    Auto-Login
                </a>
                <p style="margin-top: 30px; color: #666;">
                    This code will expire in 15 minutes. If you didn't request this, please ignore this email.
                </p>
            </div>
        `
    });
}

module.exports = { sendLoginCode };
