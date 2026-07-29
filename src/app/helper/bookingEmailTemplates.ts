const COMPANY_NAME = 'JetSet Cares';

const wrapEmailBody = (heading: string, bodyHtml: string): string => `
  <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #f4f6f8; padding: 24px;">
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.06);">

      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0A0A23 0%, #1a1a3e 100%);">
        <tr>
          <td align="center" style="padding: 32px 28px;">
            <h1 style="margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">${COMPANY_NAME}</h1>
            <p style="margin: 0; font-size: 14px; color: #3ee0cf; font-weight: 500;">${heading}</p>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 36px 32px; font-size: 15px; line-height: 1.7; color: #374151;">
            ${bodyHtml}
          </td>
        </tr>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-top: 1px solid #eee;">
        <tr>
          <td align="center" style="padding: 20px;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>
  </div>
`;

export interface BookingEmailDetails {
  partnerName: string;
  parentName: string;
  date: string;
  time: string;
  endTime?: string | null | undefined;
  location?: string | null | undefined;
}

const detailsList = (details: BookingEmailDetails) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 10px; margin: 20px 0;">
    <tr><td style="padding: 16px 20px; font-size: 14px; color: #475569;">
      <p style="margin: 0 0 6px;"><strong>Date:</strong> ${details.date}</p>
      <p style="margin: 0 0 6px;"><strong>Time:</strong> ${details.time}${details.endTime ? ` &ndash; ${details.endTime}` : ''}</p>
      ${details.location ? `<p style="margin: 0;"><strong>Location:</strong> ${details.location}</p>` : ''}
    </td></tr>
  </table>
`;

// Sent to the partner when a parent submits a Request to Book.
export const requestSubmittedEmail = (details: BookingEmailDetails) => ({
  subject: 'New booking request — response needed',
  html: wrapEmailBody(
    'New Booking Request',
    `<p>Hello ${details.partnerName},</p>
     <p>${details.parentName} has requested to book care with you.</p>
     ${detailsList(details)}
     <p>Please accept or decline this request from your JetSet Cares dashboard as soon as possible — the time slot is being held for the parent while you respond.</p>`,
  ),
});

// Sent to the parent immediately after submitting a Request to Book.
export const requestPendingEmail = (details: BookingEmailDetails) => ({
  subject: 'Your booking request has been sent',
  html: wrapEmailBody(
    'Request Sent',
    `<p>Hello ${details.parentName},</p>
     <p>Your request has been sent. This time is being held while ${details.partnerName} responds.</p>
     ${detailsList(details)}
     <p>We'll email you as soon as ${details.partnerName} accepts or declines.</p>`,
  ),
});

// Sent to the parent when a booking is confirmed (partner accepted, or Instant Book succeeded).
export const bookingConfirmedEmail = (details: BookingEmailDetails) => ({
  subject: 'Your booking is confirmed',
  html: wrapEmailBody(
    'Booking Confirmed',
    `<p>Hello ${details.parentName},</p>
     <p><strong>Your booking is confirmed.</strong></p>
     ${detailsList(details)}
     <p>You can message ${details.partnerName} anytime from your JetSet Cares account to share care details or ask questions before your booking.</p>`,
  ),
});

// Sent to the parent when the partner declines or the request expires.
export const bookingDeclinedEmail = (details: BookingEmailDetails) => ({
  subject: 'Update on your booking request',
  html: wrapEmailBody(
    'Booking Not Available',
    `<p>Hello ${details.parentName},</p>
     <p>This partner is not available for the requested time. Your booking fee was not captured / will be released.</p>
     ${detailsList(details)}
     <p>You can search for another trusted care partner anytime on JetSet Cares.</p>`,
  ),
});

// Sent to the parent ~24h before a confirmed booking's start time.
export const bookingReminderEmail = (details: BookingEmailDetails) => ({
  subject: 'Upcoming booking reminder',
  html: wrapEmailBody(
    'Upcoming Reminder',
    `<p>Hello ${details.parentName},</p>
     <p>This is a reminder that your booking with ${details.partnerName} is coming up soon.</p>
     ${detailsList(details)}
     <p>Message ${details.partnerName} from your JetSet Cares account if anything about your care details has changed.</p>`,
  ),
});

// Sent to the parent when a pending request auto-expires without a partner response.
export const bookingExpiredEmail = (details: BookingEmailDetails) => ({
  subject: 'Your booking request expired',
  html: wrapEmailBody(
    'Request Expired',
    `<p>Hello ${details.parentName},</p>
     <p>This partner is not available for the requested time. Your booking fee was not captured / will be released.</p>
     ${detailsList(details)}
     <p>${details.partnerName} did not respond in time, so this request has expired. You can search for another trusted care partner anytime on JetSet Cares.</p>`,
  ),
});

// Sent to both parties when a booking is cancelled.
export const bookingCancelledEmail = (
  details: BookingEmailDetails,
  recipientName: string,
) => ({
  subject: 'Booking cancelled',
  html: wrapEmailBody(
    'Booking Cancelled',
    `<p>Hello ${recipientName},</p>
     <p>The following booking has been cancelled.</p>
     ${detailsList(details)}
     <p>If a Trusted Booking Fee was already charged, it has been refunded or released according to JetSet Cares policy.</p>`,
  ),
});

// Sent to JetSet support/admin when a parent or partner reports an issue.
export const disputeReportedAdminEmail = (
  details: BookingEmailDetails,
  reason: string,
  reportedByRole: string,
) => ({
  subject: `Booking dispute reported — ${details.parentName} / ${details.partnerName}`,
  html: wrapEmailBody(
    'New Dispute Reported',
    `<p>A ${reportedByRole} reported an issue on a booking.</p>
     ${detailsList(details)}
     <p><strong>Parent:</strong> ${details.parentName}</p>
     <p><strong>Partner:</strong> ${details.partnerName}</p>
     <p><strong>Reported reason:</strong></p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf5ff; border-radius: 10px; margin: 12px 0;">
       <tr><td style="padding: 16px 20px; font-size: 14px; color: #581c87;">${reason}</td></tr>
     </table>
     <p>This booking is now frozen for both parties until support resolves it from the admin dashboard.</p>`,
  ),
});

// Sent to both parties (parent and partner) once a dispute has been filed, so neither is left guessing.
export const disputeFiledEmail = (
  details: BookingEmailDetails,
  recipientName: string,
) => ({
  subject: 'An issue was reported on your booking',
  html: wrapEmailBody(
    'Dispute Under Review',
    `<p>Hello ${recipientName},</p>
     <p>An issue has been reported for the following booking, and JetSet support is reviewing it.</p>
     ${detailsList(details)}
     <p>This booking is on hold until support resolves the issue. We'll email you as soon as it's settled.</p>`,
  ),
});

// Sent to both parties once JetSet support resolves a dispute.
export const disputeResolvedEmail = (
  details: BookingEmailDetails,
  recipientName: string,
  outcomeStatus: string,
  resolutionNotes: string,
) => ({
  subject: 'Update: your reported issue has been resolved',
  html: wrapEmailBody(
    'Dispute Resolved',
    `<p>Hello ${recipientName},</p>
     <p>JetSet support has reviewed and resolved the reported issue on this booking.</p>
     ${detailsList(details)}
     <p><strong>Outcome:</strong> Booking marked as <strong>${outcomeStatus}</strong></p>
     ${resolutionNotes ? `<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 10px; margin: 12px 0;"><tr><td style="padding: 16px 20px; font-size: 14px; color: #475569;">${resolutionNotes}</td></tr></table>` : ''}
     <p>If you have further questions, reply to this email and JetSet support will follow up.</p>`,
  ),
});

// Sent to the parent once care is marked completed, prompting a review.
export const bookingCompletedEmail = (details: BookingEmailDetails) => ({
  subject: 'How was your JetSet Cares booking?',
  html: wrapEmailBody(
    'Booking Completed',
    `<p>Hello ${details.parentName},</p>
     <p>Your booking with ${details.partnerName} is complete. We hope it went well!</p>
     ${detailsList(details)}
     <p>Please take a moment to leave a review — it helps other families find trusted care.</p>`,
  ),
});
