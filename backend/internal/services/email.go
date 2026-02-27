package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
)

// SMTPConfig holds SMTP configuration.
type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	FromName string
}

// EmailService handles sending emails via SMTP.
type EmailService struct {
	Config SMTPConfig
}

// NewEmailService creates a new email service.
func NewEmailService(cfg SMTPConfig) *EmailService {
	return &EmailService{Config: cfg}
}

// IsConfigured returns true if SMTP credentials are set.
func (s *EmailService) IsConfigured() bool {
	return s.Config.Host != "" && s.Config.Username != "" && s.Config.Password != ""
}

// SendPasswordReset sends a password reset email with a styled HTML template.
func (s *EmailService) SendPasswordReset(toEmail, resetURL, userName string) error {
	subject := "Reset Your XploitVerse Password"

	htmlBody, err := renderResetEmail(resetURL, userName)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	return s.sendHTML(toEmail, subject, htmlBody)
}

// sendHTML sends an HTML email via SMTP.
func (s *EmailService) sendHTML(to, subject, htmlBody string) error {
	from := s.Config.From
	if s.Config.FromName != "" {
		from = fmt.Sprintf("%s <%s>", s.Config.FromName, s.Config.From)
	}

	headers := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n",
		from, to, subject,
	)

	msg := []byte(headers + htmlBody)

	addr := fmt.Sprintf("%s:%s", s.Config.Host, s.Config.Port)
	auth := smtp.PlainAuth("", s.Config.Username, s.Config.Password, s.Config.Host)

	if err := smtp.SendMail(addr, auth, s.Config.From, []string{to}, msg); err != nil {
		log.Printf("❌ Failed to send email to %s: %v", to, err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("📧 Email sent to %s: %s", to, subject)
	return nil
}

const resetEmailTemplate = `<!DOCTYPE html>
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
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#00ff88 0%,#3b82f6 100%);padding:30px;text-align:center;">
                            <h1 style="margin:0;color:#0a0a1a;font-size:28px;font-weight:bold;">&#128274; XploitVerse</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:40px 30px;">
                            <h2 style="color:#ffffff;margin:0 0 10px;font-size:22px;">Password Reset Request</h2>
                            <p style="color:#9ca3af;margin:0 0 25px;font-size:15px;line-height:1.6;">
                                Hi {{.UserName}}, we received a request to reset your password. Click the button below to choose a new one. This link is valid for <strong style="color:#00ff88;">10 minutes</strong>.
                            </p>
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding:10px 0 30px;">
                                        <a href="{{.ResetURL}}" style="display:inline-block;background:linear-gradient(135deg,#00ff88 0%,#00cc6a 100%);color:#0a0a1a;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:bold;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color:#6b7280;font-size:13px;margin:0 0 15px;line-height:1.5;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="color:#00ff88;font-size:12px;word-break:break-all;background:#0f0f23;padding:12px;border-radius:6px;margin:0 0 25px;">
                                {{.ResetURL}}
                            </p>
                            <hr style="border:none;border-top:1px solid #2a2a4e;margin:25px 0;">
                            <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.5;">
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#0f0f23;padding:20px 30px;text-align:center;">
                            <p style="color:#4b5563;font-size:12px;margin:0;">
                                XploitVerse — Interactive Cybersecurity Training Platform
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`

func renderResetEmail(resetURL, userName string) (string, error) {
	tmpl, err := template.New("reset").Parse(resetEmailTemplate)
	if err != nil {
		return "", err
	}

	if userName == "" {
		userName = "there"
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, struct {
		ResetURL string
		UserName string
	}{
		ResetURL: resetURL,
		UserName: userName,
	})
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}
