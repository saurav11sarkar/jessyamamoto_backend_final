const createUserSuccessfully = (
  name?: string,
  email?: string,
  companyName: string = 'Jetsetcares',
): string => `
  <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: auto; background-color: #f4f6f8; padding: 30px;">
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.06);">

      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0A0A23 0%, #1a1a3e 100%);">
        <tr>
          <td align="center" style="padding: 32px 28px;">
            <h1 style="margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">${companyName}</h1>
            <p style="margin: 0; font-size: 14px; color: #3ee0cf; font-weight: 500;">Welcome aboard!</p>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 36px 32px;">

            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 18px;">
              Hello <strong>${name || email || 'there'}</strong>,
            </p>

            <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 10px;">
              We're thrilled to have you join <strong style="color: #0A0A23;">${companyName}</strong>! Your account has been successfully created and you're all set to get started.
            </p>

            <!-- Success Badge -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 12px; border: 1px solid #a7f3d0;">
                    <tr>
                      <td align="center" style="padding: 18px 32px;">
                        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #065f46;">Account Created Successfully</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
              <tr>
                <td align="center">
                  <a href="#" style="display: inline-block; background: linear-gradient(135deg, #3ee0cf 0%, #2bc4b4 100%); color: #0A0A23; font-size: 16px; font-weight: bold; padding: 14px 40px; border-radius: 30px; text-decoration: none;">
                    Go to Dashboard
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size: 14px; color: #888; margin: 20px 0 0; line-height: 1.6;">
              If you have any questions, feel free to reply to this email — we're always happy to help.
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

export default createUserSuccessfully;
