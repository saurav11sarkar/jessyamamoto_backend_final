import cron from 'node-cron';
import User from '../modules/user/user.model';

const startSubscriptionCron = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const result = await User.updateMany(
        {
          isSubscription: true,
          subscriptionExpiry: { $lte: now },
        },
        {
          $set: { isSubscription: false },
        },
      );

      if (result.modifiedCount > 0) {
        console.log(
          `⏰ Subscription cron: disabled ${result.modifiedCount} expired subscription(s)`,
        );
      }
    } catch (err: any) {
      console.error('❌ Subscription cron error:', err.message);
    }
  });

  console.log('✅ Subscription expiry cron job started (runs every hour)');
};

export default startSubscriptionCron;
