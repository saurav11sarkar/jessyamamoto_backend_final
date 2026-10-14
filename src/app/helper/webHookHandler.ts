// import { Request, Response } from 'express';
// import Stripe from 'stripe';
// import config from '../config';
// import Payment from '../modules/payment/payment.model';
// import User from '../modules/user/user.model';
// import Subscription from '../modules/subscription/subscription.model';

// const stripe = new Stripe(config.stripe.secretKey!);

// const webHookHandler = async (req: Request, res: Response) => {
//   const sig = req.headers['stripe-signature'] as string;

//   let event: Stripe.Event;

//   try {
//     //  req.body must be raw buffer (use express.raw middleware for this route)
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       config.stripe.webhookSecret!,
//     );
//   } catch (err: any) {
//     console.error('❌ Webhook verification error:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {
//       /* ================= PAYMENT SUCCESS ================= */
//       case 'checkout.session.completed': {
//         const session = event.data.object as Stripe.Checkout.Session;

//         const payment = await Payment.findOne({ stripeSessionId: session.id });
//         if (!payment) {
// //           return res.status(200).json({ received: true });
//         }

//         payment.status = 'completed';
//         payment.stripePaymentIntentId = session.payment_intent as string;
//         await payment.save();

//         const paymentType = session.metadata?.paymentType;

//         if (paymentType === 'subscription') {
//           const user = await User.findById(payment.user);
//           const subscription = await Subscription.findById(
//             payment.subscription,
//           );

//           if (!user || !subscription)
//             return res.status(200).json({ received: true });

//           // add user to subscription if not already
//           if (!subscription.totalSubscripeUser?.includes(user._id)) {
//             subscription.totalSubscripeUser =
//               subscription.totalSubscripeUser || [];
//             subscription.totalSubscripeUser.push(user._id);
//             await subscription.save();
//           }

//           // calculate expiry
//           const months = subscription.type === 'yearly' ? 12 : 1;
//           const expiry = new Date();
//           expiry.setMonth(expiry.getMonth() + months);

//           user.isSubscription = true;
//           user.subscription = subscription._id;
//           user.subscriptionExpiry = expiry;
//           await user.save();
//         }

//         return res.status(200).json({ received: true });
//       }

//       /* ================= PAYMENT FAILED ================= */
//       case 'payment_intent.payment_failed': {
//         const intent = event.data.object as Stripe.PaymentIntent;

//         const payment = await Payment.findOne({
//           stripePaymentIntentId: intent.id,
//         });
//         if (payment) {
//           payment.status = 'failed';
//           await payment.save();
//         }

//         return res.status(200).json({ received: true });
//       }

//       default:
//         console.log(`⚠️ Unhandled event type ${event.type}`);
//         return res.status(200).json({ received: true });
//     }
//   } catch (err: any) {
//     console.error('❌ Webhook handler error:', err.message);
//     return res.status(500).send(`Webhook Handler Error: ${err.message}`);
//   }
// };

// export default webHookHandler;

//============================== update code =========================================
import { Request, Response } from 'express';
import Stripe from 'stripe';
import config from '../config';
import Payment from '../modules/payment/payment.model';
import User from '../modules/user/user.model';
import Subscription from '../modules/subscription/subscription.model';
import Booking from '../modules/booking/booking.model';
import { serviceService } from '../modules/service/service.service';
import sendMailer from './sendMailer';
import notifyUser from './notify';
import {
  bookingConfirmedEmail,
  requestPendingEmail,
  requestSubmittedEmail,
} from './bookingEmailTemplates';

const PENDING_RESPONSE_WINDOW_HOURS = 24;

const stripe = new Stripe(config.stripe.secretKey!);

const webHookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // req.body must be raw buffer (use express.raw middleware for this route)
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret!,
    );
  } catch (err: any) {
    return res.status(400).send('Webhook verification failed');
  }

  try {
    switch (event.type) {
      /* ================= PAYMENT SUCCESS ================= */
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const payment = await Payment.findOne({ stripeSessionId: session.id });
        if (!payment) {
          return res.status(200).json({ received: true });
        }

        payment.status =
          payment.captureMethod === 'manual' ? 'authorized' : 'completed';
        payment.stripePaymentIntentId = session.payment_intent as string;
        await payment.save();

        const paymentType = session.metadata?.paymentType;

        /* --------- SUBSCRIPTION PAYMENT --------- */
        if (paymentType === 'subscription') {
          const user = await User.findById(payment.user);
          const subscription = await Subscription.findById(
            payment.subscription,
          );

          if (!user || !subscription)
            return res.status(200).json({ received: true });

          // Add user to subscription if not already
          if (!subscription.totalSubscripeUser?.includes(user._id)) {
            subscription.totalSubscripeUser =
              subscription.totalSubscripeUser || [];
            subscription.totalSubscripeUser.push(user._id);
            await subscription.save();
          }

          // Calculate expiry based on plan type
          let months = 1;
          let days = 0;
          const subType = (subscription.type || '').toLowerCase();
          if (subType === 'yearly' || subType === 'annual') months = 12;
          else if (subType === '6month' || subType === '6_month' || subType === 'semi_annual') months = 6;
          else if (subType === 'weekly') days = 7;
          const expiry = new Date();
          if (days > 0) expiry.setDate(expiry.getDate() + days);
          else expiry.setMonth(expiry.getMonth() + months);

          user.isSubscription = true;
          user.subscription = subscription._id;
          user.subscriptionExpiry = expiry;
          await user.save();

          await serviceService.completePendingServiceRegistration(session.id);

        }

        /* --------- BOOKING PAYMENT --------- */
        if (paymentType === 'booking') {
          const booking = await Booking.findById(payment.booking)
            .populate({ path: 'userId', select: 'firstName lastName email' })
            .populate({
              path: 'serviceId',
              select: 'firstName lastName email userId',
            });

          if (!booking) {
            return res.status(200).json({ received: true });
          }

          booking.holdExpiresAt = null;
          booking.status =
            booking.bookingMode === 'instant' ? 'confirmed' : 'pending';
          if (booking.status === 'pending') {
            booking.responseDeadline = new Date(
              Date.now() + PENDING_RESPONSE_WINDOW_HOURS * 60 * 60 * 1000,
            );
          }
          await booking.save();

          try {
            const parent: any = booking.userId;
            const service: any = booking.serviceId;
            const emailDetails = {
              parentName:
                `${parent?.firstName || ''} ${parent?.lastName || ''}`.trim() ||
                'there',
              partnerName:
                `${service?.firstName || ''} ${service?.lastName || ''}`.trim() ||
                'your partner',
              date: booking.date,
              time: booking.time,
              endTime: booking.endTime,
              location: booking.location,
            };
            const when = `${booking.date} ${booking.time}`;

            if (booking.status === 'confirmed') {
              if (parent?.email) {
                const { subject, html } = bookingConfirmedEmail(emailDetails);
                await sendMailer(parent.email, subject, html);
              }
              if (parent?._id) {
                await notifyUser(parent._id.toString(), {
                  type: 'booking_confirmed',
                  title: 'Your booking is confirmed',
                  message: `Confirmed with ${emailDetails.partnerName} on ${when}.`,
                  bookingId: booking._id.toString(),
                });
              }
            } else {
              if (service?.email) {
                const { subject, html } = requestSubmittedEmail(emailDetails);
                await sendMailer(service.email, subject, html);
              }
              if (parent?.email) {
                const { subject, html } = requestPendingEmail(emailDetails);
                await sendMailer(parent.email, subject, html);
              }
              if (service?.userId) {
                await notifyUser(service.userId.toString(), {
                  type: 'booking_request',
                  title: 'New booking request',
                  message: `${emailDetails.parentName} requested a booking on ${when}.`,
                  bookingId: booking._id.toString(),
                });
              }
              if (parent?._id) {
                await notifyUser(parent._id.toString(), {
                  type: 'booking_pending',
                  title: 'Request sent',
                  message: `Your request to ${emailDetails.partnerName} is pending a response.`,
                  bookingId: booking._id.toString(),
                });
              }
            }
          } catch (mailError) {
            console.error('Booking notification email failed:', mailError);
          }
        }

        return res.status(200).json({ received: true });
      }

      /* ================= PAYMENT FAILED ================= */
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;

        const payment = await Payment.findOne({
          stripePaymentIntentId: intent.id,
        });

        if (payment) {
          payment.status = 'failed';
          await payment.save();

          // If it's a booking payment, you might want to cancel the booking
          if (payment.booking) {
            const booking = await Booking.findById(payment.booking);
            if (booking && booking.status === 'pending') {
              booking.status = 'cancelled';
              await booking.save();
            }
          }
        }

        return res.status(200).json({ received: true });
      }

      /* ================= TRANSFER CREATED (MONEY SENT TO SERVICE PROVIDER) ================= */
      case 'transfer.created':
      case 'application_fee.created':
        return res.status(200).json({ received: true });

      default:
        return res.status(200).json({ received: true });
    }
  } catch (err: any) {
    return res.status(500).send('Webhook handler error');
  }
};

export default webHookHandler;
