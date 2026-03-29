import nodemailer from 'nodemailer'
import config from '../config/index.js'

const renderResetEmail = (resetURL, userName = 'there') => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2a2a4e;">
          <tr>
            <td style="background:linear-gradient(135deg,#00ff88 0%,#3b82f6 100%);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#0a0a1a;font-size:28px;font-weight:bold;">XploitVerse</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#ffffff;margin:0 0 10px;font-size:22px;">Password Reset Request</h2>
              <p style="color:#9ca3af;margin:0 0 25px;font-size:15px;line-height:1.6;">
                Hi ${userName}, we received a request to reset your password. This link is valid for <strong style="color:#00ff88;">10 minutes</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:10px 0 30px;">
                    <a href="${resetURL}" style="display:inline-block;background:linear-gradient(135deg,#00ff88 0%,#00cc6a 100%);color:#0a0a1a;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:bold;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:13px;margin:0 0 15px;line-height:1.5;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="color:#00ff88;font-size:12px;word-break:break-all;background:#0f0f23;padding:12px;border-radius:6px;margin:0 0 25px;">
                ${resetURL}
              </p>
              <hr style="border:none;border-top:1px solid #2a2a4e;margin:25px 0;">
              <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.5;">
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

class EmailService {
  constructor() {
    this.transporter = null

    const smtp = config.smtp
    if (smtp.host && smtp.username && smtp.password) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: Number(smtp.port || 587),
        secure: Number(smtp.port) === 465,
        auth: {
          user: smtp.username,
          pass: smtp.password,
        },
      })
    }
  }

  isConfigured() {
    return Boolean(this.transporter)
  }

  async sendPasswordReset(toEmail, resetURL, userName) {
    if (!this.transporter) {
      return false
    }

    const fromName = config.smtp.fromName || 'XploitVerse'
    const fromAddress = config.smtp.from || config.smtp.username

    await this.transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: toEmail,
      subject: 'Reset Your XploitVerse Password',
      html: renderResetEmail(resetURL, userName),
    })

    return true
  }
}

export default new EmailService()
