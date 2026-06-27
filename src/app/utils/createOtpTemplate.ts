const createOtpTemplate = (
  code: string,
  name?: string,
  companyName: string = 'Jetsetcares',
): string => `
  <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #f4f6f8; padding: 24px;">
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.06);">

      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0A0A23 0%, #1a1a3e 100%);">
        <tr>
          <td align="center" style="padding: 32px 28px;">
            <h1 style="margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">${companyName}</h1>
            <p style="margin: 0; font-size: 14px; color: #3ee0cf; font-weight: 500;">Email Verification</p>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 36px 32px;">

            <p style="font-size: 16px; margin: 0 0 16px; color: #374151;">Hello <strong>${name || 'there'}</strong>,</p>

            <p style="font-size: 15px; line-height: 1.7; margin: 0 0 8px; color: #555;">
              We received a request to verify your account. Please use the following one-time code to complete the verification:
            </p>

            <!-- OTP Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="background: linear-gradient(135deg, #e8faf8 0%, #d4f5f0 100%); padding: 22px 48px; border-radius: 14px; font-size: 38px; font-weight: 800; color: #0A0A23; letter-spacing: 10px; border: 2px solid #3ee0cf;">
                        ${code}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef9f0; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 20px 0;">
              <tr>
                <td style="padding: 14px 18px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                    <strong>Important:</strong> This code will expire in <strong>5 minutes</strong>. Do not share this code with anyone.
                  </p>
                </td>
              </tr>
            </table>

            <p style="font-size: 14px; color: #888; margin: 20px 0 0; line-height: 1.6;">
              If you didn't request this, you can safely ignore this email.
            </p>

          </td>
        </tr>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-top: 1px solid #eee;">
        <tr>
          <td align="center" style="padding: 20px;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>
  </div>
`;

export default createOtpTemplate;
