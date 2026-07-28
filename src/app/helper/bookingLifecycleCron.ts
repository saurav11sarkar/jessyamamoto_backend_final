import cron from 'node-cron';
import { bookingService } from '../modules/booking/booking.service';

const startBookingLifecycleCron = () => {
  // Auto-expire "pending" requests a partner never responded to (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await bookingService.autoExpireStaleRequests();
      if (result.processed > 0) {
        console.log(`⏰ Booking cron: auto-expired ${result.processed} stale request(s)`);
      }
    } catch (err: any) {
      console.error('❌ Auto-expire cron error:', err.message);
    }
  });

  // Auto-complete bookings whose care window has passed, and send upcoming reminders
  // (every 30 minutes)
  cron.schedule('*/30 * * * *', async () => {
    try {
      const completed = await bookingService.autoCompletePastBookings();
      if (completed.processed > 0) {
        console.log(`⏰ Booking cron: auto-completed ${completed.processed} booking(s)`);
      }
    } catch (err: any) {
      console.error('❌ Auto-complete cron error:', err.message);
    }

    try {
      const reminded = await bookingService.sendUpcomingReminders();
      if (reminded.processed > 0) {
        console.log(`⏰ Booking cron: sent ${reminded.processed} upcoming reminder(s)`);
      }
    } catch (err: any) {
      console.error('❌ Reminder cron error:', err.message);
    }
  });

  console.log('✅ Booking lifecycle cron jobs started');
};

export default startBookingLifecycleCron;
