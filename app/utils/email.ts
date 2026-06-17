// Brevo (formerly Sendinblue) transactional email service
// Uses the REST API directly — no SDK needed

interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail({ to, toName, subject, htmlContent }: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME || "ThePitchly";

  if (!apiKey || !fromEmail) {
    console.error("Brevo credentials missing: BREVO_API_KEY or EMAIL_FROM not set in .env");
    return { 
      success: false, 
      error: "Brevo credentials missing: BREVO_API_KEY or EMAIL_FROM are not set in the server .env file." 
    };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to, name: toName }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Brevo API error:", response.status, errorBody);
      let parsedError = "Failed to send verification email.";
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.message) {
          parsedError = errorJson.message;
        }
      } catch (e) {
        parsedError = errorBody || parsedError;
      }
      return { 
        success: false, 
        error: `Brevo API error (${response.status}): ${parsedError}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send email via Brevo:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to connect to Brevo API." 
    };
  }
}


export function buildOtpEmail(name: string, otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e8e8e8;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 36px 24px;border-bottom:1px solid #f0f0f0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:18px;">✦</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-size:18px;font-weight:700;color:#111;">ThePitchly</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;line-height:1.3;">
                Verify your email
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
                Hi ${name}, use the code below to complete your ThePitchly account setup. This code expires in <strong style="color:#555;">10 minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#f8f8f8;border:1px solid #e8e8e8;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#aaa;">
                  Verification Code
                </p>
                <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:10px;color:#111;font-family:'Courier New',monospace;">
                  ${otp}
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#bbb;line-height:1.6;">
                If you didn't create a ThePitchly account, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #f0f0f0;background:#fafafa;">
              <p style="margin:0;font-size:11px;color:#ccc;text-align:center;">
                © 2026 ThePitchly · AI Outreach Architect · This is an automated message, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
