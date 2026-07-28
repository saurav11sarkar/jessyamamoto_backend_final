//=============================== update code =======================================
import Booking from './booking.model';
import AppError from '../../error/appError';
import Service from '../service/service.model';
import User from '../user/user.model';
import Payment from '../payment/payment.model';
import Subscription from '../subscription/subscription.model';
import Category from '../category/category.model';
import Country from '../countery/countery.model';
import pagination, { IOption } from '../../helper/pagenation';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import config from '../../config';
import sendMailer from '../../helper/sendMailer';
import notifyUser from '../../helper/notify';
import {
  bookingCancelledEmail,
  bookingCompletedEmail,
  bookingConfirmedEmail,
  bookingDeclinedEmail,
  bookingExpiredEmail,
  bookingReminderEmail,
  BookingEmailDetails,
} from '../../helper/bookingEmailTemplates';

const buildBookingEmailDetails = (booking: any): BookingEmailDetails => {
  const parent: any = booking.userId;
  const service: any = booking.serviceId;
  return {
    parentName:
      `${parent?.firstName || ''} ${parent?.lastName || ''}`.trim() || 'there',
    partnerName:
      `${service?.firstName || ''} ${service?.lastName || ''}`.trim() ||
      'your partner',
    date: booking.date,
    time: booking.time,
    endTime: booking.endTime,
    location: booking.location,
  };
};

const stripe = new Stripe(config.stripe.secretKey!);

const NON_MEMBER_BOOKING_FEE_PERCENT = 20;
const NON_MEMBER_BOOKING_FEE_MINIMUM = 3.5;
const MEMBER_BOOKING_FEE_PERCENT = 8.88;
const MEMBER_BOOKING_FEE_MINIMUM = 1.25;
const SLOT_HOLD_MINUTES = 15;

const withBookingProgress = <T extends { status?: string }>(booking: T) => {
  const status = String(booking.status || 'draft').toLowerCase();
  const totalSteps = 4;

  const progressMap: Record<
    string,
    { step: number; label: string; isTerminal: boolean }
  > = {
    draft: { step: 0, label: 'Draft', isTerminal: false },
    pending: {
      step: 1,
      label: 'Pending payment or partner acceptance',
      isTerminal: false,
    },
    confirmed: { step: 3, label: 'Booking confirmed', isTerminal: false },
    accepted: { step: 3, label: 'Booking confirmed', isTerminal: false },
    completed: { step: 4, label: 'Booking completed', isTerminal: true },
    declined: { step: 0, label: 'Booking declined', isTerminal: true },
    cancelled: { step: 0, label: 'Booking cancelled', isTerminal: true },
    refunded: { step: 0, label: 'Booking refunded', isTerminal: true },
  };

  const progress =
    progressMap[status] || progressMap.pending || { step: 1, label: '', isTerminal: false };

  return {
    ...booking,
    bookingProgress: {
      ...progress,
      totalSteps,
      status,
    },
  };
};

// ===================== Helper: Validate Date Format =====================
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// ===================== Helper: Validate Day and Date Match =====================
const normalizeDay = (d: string) => {
  const value = (d || '').trim().toLowerCase();
  const dayMap: Record<string, string> = {
    sun: 'sunday',
    sunday: 'sunday',
    mon: 'monday',
    monday: 'monday',
    tue: 'tuesday',
    tues: 'tuesday',
    tuesday: 'tuesday',
    wed: 'wednesday',
    wednesday: 'wednesday',
    thu: 'thursday',
    thur: 'thursday',
    thurs: 'thursday',
    thursday: 'thursday',
    fri: 'friday',
    friday: 'friday',
    sat: 'saturday',
    saturday: 'saturday',
  };
  return dayMap[value] || value;
};

const validateDayAndDate = (day: string, date: string): void => {
  const bookingDate = new Date(date);
  const weekDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const actualDay = weekDays[bookingDate.getDay()] || '';

  if (normalizeDay(actualDay) !== normalizeDay(day)) {
    throw new AppError(
      400,
      `Date does not match selected day. ${date} is ${actualDay}, not ${day}`,
    );
  }
};

// ===================== Helper: Validate Booking Date (Not in Past) =====================
const validateBookingDate = (date: string): void => {
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bookingDate < today) {
    throw new AppError(400, 'Cannot book for past dates');
  }
};

// ===================== Helper: Time Parser (supports 24h + am/pm) =====================
const parseTimeToMinutes = (input: string): number | null => {
  if (!input) return null;

  const s = input.trim().toLowerCase().replace(/\s+/g, '');

  // 1) HH:mm (24h) e.g. "11:30"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
    return null;
  }

  // 2) H(am/pm) or H:mm(am/pm) e.g. "5am", "2pm", "2:30pm"
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (m12) {
    let h = Number(m12[1]);
    const m = m12[2] ? Number(m12[2]) : 0;
    const ap = m12[3];

    if (h < 1 || h > 12 || m < 0 || m > 59) return null;

    if (ap === 'am') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h = h + 12;
    }
    return h * 60 + m;
  }

  return null;
};

const isTimeWithinRange = (time: string, start: string, end: string) => {
  const t = parseTimeToMinutes(time);
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);

  if (t === null || s === null || e === null) return false;

  // normal range
  if (s <= e) return t >= s && t <= e;

  // overnight range support
  return t >= s || t <= e;
};

const getBookingDurationHours = (
  date: string,
  time: string,
  endDate?: string,
  endTime?: string,
) => {
  if (!endTime) return 1;
  const startMinutes = parseTimeToMinutes(time);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return 1;

  const effectiveEndMinutes =
    endMinutes <= startMinutes && endDate && endDate !== date
      ? endMinutes + 24 * 60
      : endMinutes;
  const minutes = Math.max(effectiveEndMinutes - startMinutes, 60);
  return Number((minutes / 60).toFixed(2));
};

// The free/non-member tier is a real, admin-editable Subscription row (type: 'free') rather
// than a hardcoded constant. It is upserted lazily here so pricing always works even if the
// row hasn't been created yet; after the first call it's a normal row an admin can edit from
// the dashboard membership page, matching the paid-tier behavior below.
const getFreeTierSubscription = async () => {
  try {
    return await Subscription.findOneAndUpdate(
      { type: 'free' },
      {
        $setOnInsert: {
          type: 'free',
          title: 'Free Membership',
          price: 0,
          bookingFeePercent: NON_MEMBER_BOOKING_FEE_PERCENT,
          bookingFeeMinimum: NON_MEMBER_BOOKING_FEE_MINIMUM,
          description:
            'Create a JetSet Cares account, explore care options, and book without paid member savings.',
          content:
            'Free account access, Browse trusted care profiles, Upgrade anytime for member savings',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
  } catch {
    return null;
  }
};

const getBookingPricing = async (
  user: any,
  hourlyRate: number,
  durationHours: number,
  categoryId?: any,
  cityName?: string,
) => {
  const hasActiveMembership =
    user.isSubscription === true &&
    user.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > new Date();

  let bookingFeePercent = NON_MEMBER_BOOKING_FEE_PERCENT;
  let bookingFeeMinimum = NON_MEMBER_BOOKING_FEE_MINIMUM;
  let membershipType = 'non-member';
  let membershipPrice = 0;

  if (hasActiveMembership) {
    const subscription = user.subscription
      ? await Subscription.findById(user.subscription).lean()
      : null;
    bookingFeePercent =
      Number(subscription?.bookingFeePercent) || MEMBER_BOOKING_FEE_PERCENT;
    bookingFeeMinimum =
      Number(subscription?.bookingFeeMinimum) || MEMBER_BOOKING_FEE_MINIMUM;
    membershipType = subscription?.type || 'member';
    membershipPrice = Number(subscription?.price || 0);
  } else {
    const freeTier = await getFreeTierSubscription();
    bookingFeePercent =
      Number(freeTier?.bookingFeePercent) || NON_MEMBER_BOOKING_FEE_PERCENT;
    bookingFeeMinimum =
      Number(freeTier?.bookingFeeMinimum) || NON_MEMBER_BOOKING_FEE_MINIMUM;
    membershipType = freeTier?.type || 'non-member';
  }

  // City-level override (from the admin-managed Country/City taxonomy) applies before the
  // category override, so a deliberate category-wide policy always wins when both are set.
  if (cityName) {
    const country = await Country.findOne({ 'cities.cityName': cityName })
      .select('cities.$')
      .lean();
    const city = country?.cities?.[0];
    if (city?.bookingFeePercent != null) {
      bookingFeePercent = Number(city.bookingFeePercent);
    }
    if (city?.bookingFeeMinimum != null) {
      bookingFeeMinimum = Number(city.bookingFeeMinimum);
    }
  }

  // Category-level override takes precedence over the free/member rate when the admin
  // has set one for this care category (e.g. tutoring priced differently than childcare).
  if (categoryId) {
    const category = await Category.findById(categoryId)
      .select('bookingFeePercent bookingFeeMinimum')
      .lean();
    if (category?.bookingFeePercent != null) {
      bookingFeePercent = Number(category.bookingFeePercent);
    }
    if (category?.bookingFeeMinimum != null) {
      bookingFeeMinimum = Number(category.bookingFeeMinimum);
    }
  }

  const serviceSubtotal = Number((hourlyRate * durationHours).toFixed(2));
  const percentFee = serviceSubtotal * (bookingFeePercent / 100);
  const trustedBookingFee = Number(
    Math.max(percentFee, bookingFeeMinimum).toFixed(2),
  );

  return {
    hourlyRate,
    durationHours,
    serviceSubtotal,
    bookingFeePercent,
    bookingFeeMinimum,
    trustedBookingFee,
    currency: 'usd',
    membershipType,
    membershipPrice,
    payNowTotal: trustedBookingFee,
    payPartnerLater: serviceSubtotal,
  };
};

// ===================== Helper: Check Time Slot Availability =====================
const isSlotAvailable = async (
  serviceId: string,
  day: string,
  date: string,
  time: string,
  endDate?: string,
  endTime?: string,
  excludeBookingId?: string,
): Promise<boolean> => {
  const query: any = {
    serviceId,
    date,
    $or: [
      { status: { $in: ['pending', 'confirmed', 'accepted'] } },
      { status: 'draft', holdExpiresAt: { $gt: new Date() } },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
  }

  const sameDateBookings = await Booking.find(query).lean();
  const requestedStart = parseTimeToMinutes(time);
  const requestedEnd = parseTimeToMinutes(endTime || time);

  if (requestedStart === null) return false;

  const requestedEndMinutes =
    requestedEnd === null
      ? requestedStart + 60
      : requestedEnd <= requestedStart && endDate && endDate !== date
        ? requestedEnd + 24 * 60
        : requestedEnd;

  const conflict = sameDateBookings.some((booking: any) => {
    if (normalizeDay(booking.day) !== normalizeDay(day)) return false;

    const existingStart = parseTimeToMinutes(booking.time);
    const existingEnd = parseTimeToMinutes(booking.endTime || booking.time);

    if (existingStart === null) return false;

    const existingEndMinutes =
      existingEnd === null
        ? existingStart + 60
        : existingEnd <= existingStart &&
            booking.endDate &&
            booking.endDate !== booking.date
          ? existingEnd + 24 * 60
          : existingEnd;

    return (
      requestedStart < existingEndMinutes &&
      requestedEndMinutes > existingStart
    );
  });

  return !conflict;
};

// ===================== Create Booking (FIXED) =====================
const createBooking = async (payload: {
  serviceId: string;
  day: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  userId: string;
  bookingMode?: 'request' | 'instant';
  hotelName?: string;
  childCount?: number;
  childAges?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  medicalNotes?: string;
  instructions?: string;
  location?: string;
  timezone?: string;
  idempotencyKey?: string;
}) => {
  // DATE VALIDATION
  if (!isValidDate(payload.date)) {
    throw new AppError(400, 'Invalid date format. Use YYYY-MM-DD');
  }
  validateBookingDate(payload.date);
  validateDayAndDate(payload.day, payload.date);
  if (payload.endDate && !isValidDate(payload.endDate)) {
    throw new AppError(400, 'Invalid endDate format. Use YYYY-MM-DD');
  }
  if (payload.endDate) validateBookingDate(payload.endDate);

  // OBJECT ID VALIDATION
  if (!mongoose.Types.ObjectId.isValid(payload.serviceId)) {
    throw new AppError(400, 'Invalid service ID');
  }

  // USER CHECK
  const user = await User.findById(payload.userId);
  if (!user) throw new AppError(404, 'User not found');

  if (user.role !== 'find care') {
    throw new AppError(403, 'Only find care users can create bookings');
  }

  // SERVICE CHECK
  const service = await Service.findById(payload.serviceId)
    .populate('userId')
    .lean();

  if (!service) throw new AppError(404, 'Service not found');
  if (!service.categoryId)
    throw new AppError(400, 'Service category not found');

  const provider: any = service.userId;

  // Find care books services offered by find job (service provider) users only
  const providerRole = String(provider?.role ?? '')
    .toLowerCase()
    .trim();
  if (providerRole !== 'find job') {
    throw new AppError(
      400,
      'Bookings are only available for find job service providers',
    );
  }

  // Prevent self booking
  if (provider?._id?.toString() === payload.userId) {
    throw new AppError(400, 'You cannot book your own service');
  }

  // DAY SLOT CHECK ✅
  const daySlot = (service.days || []).find(
    (d: any) => normalizeDay(d.day) === normalizeDay(payload.day),
  );

  if (!daySlot) {
    throw new AppError(400, `Service is not available on ${payload.day}`);
  }

  // TIME RANGE CHECK ✅
  const ok = isTimeWithinRange(
    payload.time,
    daySlot.startTime,
    daySlot.endTime,
  );
  if (!ok) {
    throw new AppError(
      400,
      `Service is available ${daySlot.startTime} - ${daySlot.endTime} on ${payload.day}`,
    );
  }

  if (payload.endTime) {
    const endOk = isTimeWithinRange(
      payload.endTime,
      daySlot.startTime,
      daySlot.endTime,
    );
    if (!endOk) {
      throw new AppError(
        400,
        `Service is available ${daySlot.startTime} - ${daySlot.endTime} on ${payload.day}`,
      );
    }

    const startMinutes = parseTimeToMinutes(payload.time);
    const endMinutes = parseTimeToMinutes(payload.endTime);
    if (startMinutes === null || endMinutes === null) {
      throw new AppError(400, 'Invalid booking time');
    }

    const startsAt = new Date(`${payload.date}T${payload.time}`);
    const effectiveEndDate =
      payload.endDate ||
      (endMinutes <= startMinutes
        ? new Date(new Date(payload.date).getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)
        : payload.date);
    const endsAt = new Date(`${effectiveEndDate}T${payload.endTime}`);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new AppError(400, 'Invalid booking time window');
    }
    if (endsAt <= startsAt) {
      throw new AppError(400, 'End time must be after start time');
    }
  }

  // BOOKING RULES: min notice, max horizon, blocked dates ✅
  const bookingStartsAt = new Date(`${payload.date}T${payload.time}`);
  if (!Number.isNaN(bookingStartsAt.getTime())) {
    const hoursUntilBooking =
      (bookingStartsAt.getTime() - Date.now()) / (1000 * 60 * 60);
    const minAdvanceNoticeHours = Number(service.minAdvanceNoticeHours ?? 0);
    if (minAdvanceNoticeHours > 0 && hoursUntilBooking < minAdvanceNoticeHours) {
      throw new AppError(
        400,
        `This partner requires at least ${minAdvanceNoticeHours} hour(s) advance notice`,
      );
    }

    const maxBookingHorizonDays = Number(service.maxBookingHorizonDays ?? 0);
    if (
      maxBookingHorizonDays > 0 &&
      hoursUntilBooking > maxBookingHorizonDays * 24
    ) {
      throw new AppError(
        400,
        `This partner only accepts bookings up to ${maxBookingHorizonDays} day(s) in advance`,
      );
    }
  }

  const isBlockedDate = (service.blockedDates || []).some(
    (entry: any) => entry.date === payload.date,
  );
  if (isBlockedDate) {
    throw new AppError(400, 'This partner is not available on the selected date');
  }

  // SLOT CHECK ✅
  const available = await isSlotAvailable(
    payload.serviceId,
    payload.day,
    payload.date,
    payload.time,
    payload.endDate,
    payload.endTime,
  );
  if (!available) {
    throw new AppError(409, 'This time slot is already booked for that date');
  }

  // PAYMENT CALC ✅
  const hourRate = Number(service.hourRate || 0);
  if (hourRate <= 0) {
    throw new AppError(400, 'Service hourRate is not set');
  }

  const durationHours = getBookingDurationHours(
    payload.date,
    payload.time,
    payload.endDate,
    payload.endTime,
  );
  const pricingSnapshot = await getBookingPricing(
    user,
    hourRate,
    durationHours,
    service.categoryId,
    provider?.city || service.location,
  );
  const trustedBookingFeeCents = Math.round(
    pricingSnapshot.trustedBookingFee * 100,
  );
  const bookingMode = payload.bookingMode === 'instant' ? 'instant' : 'request';
  const captureMethod = bookingMode === 'request' ? 'manual' : 'automatic';
  const idempotencyKey =
    payload.idempotencyKey ||
    `booking:${payload.userId}:${payload.serviceId}:${payload.date}:${payload.time}:${payload.endTime || ''}`;
  const holdExpiresAt = new Date(Date.now() + SLOT_HOLD_MINUTES * 60 * 1000);

  // TRANSACTION ✅
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [createdBooking] = await Booking.create(
      [
        {
          serviceId: service._id,
          categoryId: service.categoryId,
          userId: payload.userId,
          day: payload.day,
          date: payload.date,
          time: payload.time,
          endDate: payload.endDate,
          endTime: payload.endTime,
          bookingMode,
          location: payload.location || service.location,
          hotelName: payload.hotelName,
          childCount: payload.childCount,
          childAges: payload.childAges,
          emergencyContactName: payload.emergencyContactName,
          emergencyContactPhone: payload.emergencyContactPhone,
          allergies: payload.allergies,
          medicalNotes: payload.medicalNotes,
          instructions: payload.instructions,
          timezone: payload.timezone,
          holdExpiresAt,
          pricingSnapshot,
          status: 'draft',
        },
      ],
      { session },
    );

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: user.email,
        payment_intent_data: {
          capture_method: captureMethod,
          metadata: {
            bookingId: createdBooking!._id.toString(),
            paymentType: 'booking',
            bookingMode,
          },
        },
        line_items: [
          {
            price_data: {
              currency: pricingSnapshot.currency,
              unit_amount: trustedBookingFeeCents,
              product_data: {
                name: `JetSet Trusted Booking Fee: ${service.firstName} ${service.lastName}`,
                description: `Pay now: JetSet Trusted Booking Fee. Pay partner later: $${pricingSnapshot.payPartnerLater} directly to the partner at service time.`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: config.stripeCheckoutUrls.bookingSuccessUrl,
        cancel_url: config.stripeCheckoutUrls.bookingCancelUrl,
        metadata: {
          userId: payload.userId,
          serviceId: payload.serviceId,
          bookingId: createdBooking!._id.toString(),
          serviceProviderId: provider._id.toString(),
          day: payload.day,
          date: payload.date,
          time: payload.time,
          endDate: payload.endDate || '',
          endTime: payload.endTime || '',
          paymentType: 'booking',
          bookingMode,
          trustedBookingFee: trustedBookingFeeCents.toString(),
          caregiverRate: Math.round(pricingSnapshot.payPartnerLater * 100).toString(),
          platformFeeRate: pricingSnapshot.bookingFeePercent.toString(),
          membershipType: pricingSnapshot.membershipType,
        },
      },
      { idempotencyKey },
    );

    await Payment.create(
      [
        {
          user: payload.userId,
          service: service._id,
          booking: createdBooking!._id,
          category: service.categoryId,
          stripeSessionId: checkoutSession.id,
          amount: trustedBookingFeeCents / 100,
          currency: 'usd',
          status: 'pending',
          paymentType: 'booking',
          userType: 'findCare',
          adminFree: trustedBookingFeeCents / 100,
          serviceProviderFree: 0,
          caregiverRate: hourRate,
          idempotencyKey,
          captureMethod,
          providerPayoutStatus: 'direct_cash',
        },
      ],
      { session },
    );

    user.totalBooking = user.totalBooking || [];
    user.totalBooking.push(createdBooking!._id);
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      booking: createdBooking,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      paymentDetails: {
        ...pricingSnapshot,
      },
    };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
};

// ===================== Update Booking (FIXED SLOT VALIDATION) =====================
const updateBooking = async (id: string, payload: any, userId?: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid booking ID');
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const booking = await Booking.findById(id).populate({
    path: 'serviceId',
    select: 'userId days blockedDates',
  });

  if (!booking) throw new AppError(404, 'Booking not found');

  // Authorization
  if (user.role !== 'admin') {
    const isBookingOwner = booking.userId.toString() === userId;
    const isServiceProvider =
      (booking.serviceId as any).userId?.toString() === userId;

    if (!isBookingOwner && !isServiceProvider) {
      throw new AppError(
        403,
        'You do not have permission to update this booking',
      );
    }

    // Provider can only update status (and a dispute reason, when reporting one)
    if (isServiceProvider && !isBookingOwner) {
      const allowedFields = ['status', 'disputeReason'];
      const hasInvalidField = Object.keys(payload).some(
        (key) => !allowedFields.includes(key),
      );
      if (hasInvalidField) {
        throw new AppError(
          403,
          'Service providers can only update booking status',
        );
      }
    }
  }

  if (['completed', 'cancelled', 'declined', 'refunded'].includes(booking.status)) {
    throw new AppError(400, `Cannot update ${booking.status} booking`);
  }

  // ✅ If updating slot: re-validate day/date/time properly
  if (payload.day || payload.date || payload.time) {
    const newDay = payload.day || booking.day;
    const newDate = payload.date || booking.date;
    const newTime = payload.time || booking.time;

    if (payload.date && !isValidDate(payload.date)) {
      throw new AppError(400, 'Invalid date format. Use YYYY-MM-DD');
    }
    if (payload.date) validateBookingDate(payload.date);

    validateDayAndDate(newDay, newDate);

    const serviceDoc: any = booking.serviceId; // populated partial service (days)
    const daySlot = (serviceDoc?.days || []).find(
      (d: any) => normalizeDay(d.day) === normalizeDay(newDay),
    );

    if (!daySlot) {
      throw new AppError(400, `Service is not available on ${newDay}`);
    }

    const isBlockedDate = (serviceDoc?.blockedDates || []).some(
      (entry: any) => entry.date === newDate,
    );
    if (isBlockedDate) {
      throw new AppError(400, 'This partner is not available on the selected date');
    }

    const ok = isTimeWithinRange(newTime, daySlot.startTime, daySlot.endTime);
    if (!ok) {
      throw new AppError(
        400,
        `Service is available ${daySlot.startTime} - ${daySlot.endTime} on ${newDay}`,
      );
    }

    const serviceIdString = serviceDoc?._id?.toString();
    const available = await isSlotAvailable(
      serviceIdString,
      newDay,
      newDate,
      newTime,
      payload.endDate || booking.endDate,
      payload.endTime || booking.endTime,
      id, // exclude this booking
    );
    if (!available) {
      throw new AppError(409, 'This time slot is already booked');
    }
  }

  // Status transition validation (keep your logic)
  if (payload.status) {
    if (payload.status === 'accepted') payload.status = 'confirmed';
    const validTransitions: { [key: string]: string[] } = {
      draft: ['pending', 'cancelled'],
      pending: ['confirmed', 'declined', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no_show', 'disputed'],
      accepted: ['completed', 'cancelled', 'no_show', 'disputed'],
    };

    const allowedStatuses = validTransitions[booking.status] || [];
    if (!allowedStatuses.includes(payload.status)) {
      throw new AppError(
        400,
        `Cannot change status from ${booking.status} to ${payload.status}`,
      );
    }

    if (payload.status === 'disputed') {
      if (!payload.disputeReason || !String(payload.disputeReason).trim()) {
        throw new AppError(400, 'disputeReason is required to report a dispute');
      }
      payload.disputeReportedBy = userId;
    }

    if (payload.status === 'confirmed') {
      const payment = await Payment.findOne({ booking: booking._id });
      if (
        payment?.captureMethod === 'manual' &&
        payment.stripePaymentIntentId &&
        payment.status === 'authorized'
      ) {
        await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
        payment.status = 'completed';
        await payment.save();
      }
    }

    if (payload.status === 'declined') {
      const payment = await Payment.findOne({ booking: booking._id });
      if (
        payment?.captureMethod === 'manual' &&
        payment.stripePaymentIntentId &&
        payment.status === 'authorized'
      ) {
        await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
        payment.status = 'failed';
        await payment.save();
      }
    }
  }

  const updatedBooking = await Booking.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate({
      path: 'userId',
      select: 'firstName lastName email phone profileImage role professionalSkill',
    })
    .populate({
      path: 'serviceId',
      select: 'firstName lastName email location hourRate',
    })
    .populate({
      path: 'categoryId',
      select: 'name',
    });

  if (updatedBooking && payload.status) {
    try {
      const parent: any = updatedBooking.userId;
      const emailDetails = buildBookingEmailDetails(updatedBooking);
      const bookingId = updatedBooking._id.toString();
      const when = `${updatedBooking.date} ${updatedBooking.time}`;

      if (payload.status === 'confirmed' && parent?.email) {
        const { subject, html } = bookingConfirmedEmail(emailDetails);
        await sendMailer(parent.email, subject, html);
      } else if (payload.status === 'declined' && parent?.email) {
        const { subject, html } = bookingDeclinedEmail(emailDetails);
        await sendMailer(parent.email, subject, html);
      } else if (payload.status === 'completed' && parent?.email) {
        const { subject, html } = bookingCompletedEmail(emailDetails);
        await sendMailer(parent.email, subject, html);
      }

      if (parent?._id) {
        if (payload.status === 'confirmed') {
          await notifyUser(parent._id.toString(), {
            type: 'booking_confirmed',
            title: 'Your booking is confirmed',
            message: `Confirmed with ${emailDetails.partnerName} on ${when}.`,
            bookingId,
          });
        } else if (payload.status === 'declined') {
          await notifyUser(parent._id.toString(), {
            type: 'booking_declined',
            title: 'Booking not available',
            message: `${emailDetails.partnerName} is not available for ${when}.`,
            bookingId,
          });
        } else if (payload.status === 'completed') {
          await notifyUser(parent._id.toString(), {
            type: 'booking_completed',
            title: 'Booking completed',
            message: `Your booking with ${emailDetails.partnerName} is complete. Leave a review!`,
            bookingId,
          });
        }
      }
    } catch (mailError) {
      console.error('Booking notification email failed:', mailError);
    }
  }

  return updatedBooking;
};

// ===================== Get All Bookings (Admin) =====================
const getAllBooking = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, status, date, day, userId, serviceId, ...filterData } =
    params;

  const andCondition: any[] = [];

  // Search functionality
  if (searchTerm) {
    andCondition.push({
      $or: [
        { day: { $regex: searchTerm, $options: 'i' } },
        { date: { $regex: searchTerm, $options: 'i' } },
        { time: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  // Filter by status
  if (status) {
    andCondition.push({ status });
  }

  // Filter by date
  if (date) {
    andCondition.push({ date });
  }

  // Filter by day
  if (day) {
    andCondition.push({ day });
  }

  // Filter by userId
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    andCondition.push({ userId: new mongoose.Types.ObjectId(userId) });
  }

  // Filter by serviceId
  if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
    andCondition.push({ serviceId: new mongoose.Types.ObjectId(serviceId) });
  }

  // Other filters
  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Booking.find(whereCondition)
    .populate({
      path: 'userId',
      select: 'firstName lastName email phone profileImage role',
    })
    .populate({
      path: 'serviceId',
      select: 'firstName lastName email location hourRate gender days',
    })
    .populate({
      path: 'categoryId',
      select: 'name',
    })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any);

  const total = await Booking.countDocuments(whereCondition);
  const enhancedData = result.map((booking) =>
    withBookingProgress(booking.toObject()),
  );

  return {
    data: enhancedData,
    meta: {
      total,
      page,
      limit,
    },
  };
};

// ===================== Get My Bookings (User) =====================
const getAllMyBooking = async (
  userId: string,
  params: any,
  options: IOption,
) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, status, date, upcoming, ...filterData } = params;

  const andCondition: any[] = [{ userId }];

  // Search functionality
  if (searchTerm) {
    andCondition.push({
      $or: [
        { day: { $regex: searchTerm, $options: 'i' } },
        { time: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  // Filter by status
  if (status) {
    andCondition.push({ status });
  }

  // Filter by date
  if (date) {
    andCondition.push({ date });
  }

  // Filter upcoming bookings
  if (upcoming === 'true') {
    const today = new Date().toISOString().slice(0, 10);
    andCondition.push({ date: { $gte: today } });
  }

  // Other filters
  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Booking.find(whereCondition)
    .populate({
      path: 'serviceId',
      select: 'firstName lastName email location hourRate gender days',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone profileImage role professionalSkill',
      },
    })
    .populate({
      path: 'categoryId',
      select: 'name',
    })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any);

  const total = await Booking.countDocuments(whereCondition);
  const enhancedData = result.map((booking) =>
    withBookingProgress(booking.toObject()),
  );

  return {
    data: enhancedData,
    meta: {
      total,
      page,
      limit,
    },
  };
};

// ===================== Get Bookings for Service Provider =====================
const getMyServiceBookings = async (
  userId: string,
  params: any,
  options: IOption,
) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, status, date, upcoming, ...filterData } = params;

  // Find all services of this user
  const services = await Service.find({ userId });
  const serviceIds = services.map((s) => s._id);

  if (serviceIds.length === 0) {
    return {
      data: [],
      meta: { total: 0, page, limit },
    };
  }

  const andCondition: any[] = [{ serviceId: { $in: serviceIds } }];

  // Search functionality
  if (searchTerm) {
    andCondition.push({
      $or: [
        { day: { $regex: searchTerm, $options: 'i' } },
        { time: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  // Filter by status
  if (status) {
    andCondition.push({ status });
  }

  // Filter by date
  if (date) {
    andCondition.push({ date });
  }

  // Filter upcoming bookings
  if (upcoming === 'true') {
    const today = new Date().toISOString().slice(0, 10);
    andCondition.push({ date: { $gte: today } });
  }

  // Other filters
  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Booking.find(whereCondition)
    .populate({
      path: 'userId',
      select: 'firstName lastName email phone profileImage',
    })
    .populate({
      path: 'serviceId',
      select: 'firstName lastName location hourRate',
    })
    .populate({
      path: 'categoryId',
      select: 'name',
    })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any);

  const total = await Booking.countDocuments(whereCondition);
  const enhancedData = result.map((booking) =>
    withBookingProgress(booking.toObject()),
  );

  return {
    data: enhancedData,
    meta: {
      total,
      page,
      limit,
    },
  };
};

// ===================== Get Single Booking =====================
const getSingleBooking = async (id: string, userId?: string, role?: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid booking ID');
  }

  const booking = await Booking.findById(id)
    .populate({
      path: 'userId',
      select: 'firstName lastName email phone profileImage role',
    })
    .populate({
      path: 'serviceId',
      select: 'firstName lastName email location hourRate gender days userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone profileImage',
      },
    })
    .populate({
      path: 'categoryId',
      select: 'name',
    });

  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }

  // Authorization check
  if (role !== 'admin' && userId) {
    const isBookingOwner = booking.userId._id.toString() === userId;
    const isServiceProvider =
      (booking.serviceId as any).userId?._id.toString() === userId;

    if (!isBookingOwner && !isServiceProvider) {
      throw new AppError(
        403,
        'You do not have permission to view this booking',
      );
    }
  }

  return withBookingProgress(booking.toObject());
};

// // ===================== Update Booking =====================
// const updateBooking = async (id: string, payload: any, userId?: string) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new AppError(400, 'Invalid booking ID');
//   }

//   const user = await User.findById(userId);
//   if (!user) {
//     throw new AppError(404, 'User not found');
//   }

//   const booking = await Booking.findById(id).populate({
//     path: 'serviceId',
//     select: 'userId days',
//   });

//   if (!booking) {
//     throw new AppError(404, 'Booking not found');
//   }

//   // Authorization check
//   if (user.role !== 'admin') {
//     const isBookingOwner = booking.userId.toString() === userId;
//     const isServiceProvider =
//       (booking.serviceId as any).userId?.toString() === userId;

//     if (!isBookingOwner && !isServiceProvider) {
//       throw new AppError(
//         403,
//         'You do not have permission to update this booking',
//       );
//     }

//     // Service provider can only update status to accept or complete
//     if (isServiceProvider && !isBookingOwner) {
//       const allowedFields = ['status'];
//       const hasInvalidField = Object.keys(payload).some(
//         (key) => !allowedFields.includes(key),
//       );
//       if (hasInvalidField) {
//         throw new AppError(
//           403,
//           'Service providers can only update booking status',
//         );
//       }
//     }
//   }

//   // Prevent updating completed or cancelled bookings
//   if (['completed', 'cancelled'].includes(booking.status)) {
//     throw new AppError(400, `Cannot update ${booking.status} booking`);
//   }

//   // If updating time slot, validate availability
//   if (payload.day || payload.date || payload.time) {
//     const day = payload.day || booking.day;
//     const date = payload.date || booking.date;
//     const time = payload.time || booking.time;

//     // Validate date format
//     if (payload.date && !isValidDate(payload.date)) {
//       throw new AppError(400, 'Invalid date format. Use YYYY-MM-DD');
//     }

//     // Validate booking date
//     if (payload.date) {
//       validateBookingDate(payload.date);
//     }

//     // Validate day and date match
//     validateDayAndDate(day, date);

//     // Check service availability for new slot
//     const service = booking.serviceId as any;
//     if (payload.day && !service?.days?.day?.includes(payload.day)) {
//       throw new AppError(400, 'Service is not available on this day');
//     }
//     if (payload.time && !service?.days?.time?.includes(payload.time)) {
//       throw new AppError(400, 'Service is not available at this time');
//     }

//     // Check slot availability - use _id from populated service
//     const serviceIdString = (booking.serviceId as any)._id.toString();
//     const available = await isSlotAvailable(
//       serviceIdString,
//       day,
//       date,
//       time,
//       id, // Exclude current booking
//     );

//     if (!available) {
//       throw new AppError(409, 'This time slot is already booked');
//     }
//   }

//   // Status transition validation
//   if (payload.status) {
//     const validTransitions: { [key: string]: string[] } = {
//       pending: ['accepted', 'cancelled'], // After payment, service provider can accept
//       accepted: ['completed', 'cancelled'], // Service provider or user can complete
//     };

//     const allowedStatuses = validTransitions[booking.status] || [];
//     if (!allowedStatuses.includes(payload.status)) {
//       throw new AppError(
//         400,
//         `Cannot change status from ${booking.status} to ${payload.status}`,
//       );
//     }

//     // Update user's booking arrays based on status
//     if (payload.status === 'completed') {
//       const bookingUser = await User.findById(booking.userId);
//       if (bookingUser) {
//         bookingUser.completeBooking = bookingUser.completeBooking || [];
//         if (!bookingUser.completeBooking.includes(booking._id)) {
//           bookingUser.completeBooking.push(booking._id);
//           await bookingUser.save();
//         }
//       }
//     }

//     if (payload.status === 'cancelled') {
//       const bookingUser = await User.findById(booking.userId);
//       if (bookingUser) {
//         bookingUser.cencleBooking = bookingUser.cencleBooking || [];
//         if (!bookingUser.cencleBooking.includes(booking._id)) {
//           bookingUser.cencleBooking.push(booking._id);
//           await bookingUser.save();
//         }
//       }
//     }
//   }

//   const updatedBooking = await Booking.findByIdAndUpdate(id, payload, {
//     new: true,
//     runValidators: true,
//   })
//     .populate({
//       path: 'userId',
//       select: 'firstName lastName email phone profileImage',
//     })
//     .populate({
//       path: 'serviceId',
//       select: 'firstName lastName email location hourRate',
//     })
//     .populate({
//       path: 'categoryId',
//       select: 'name',
//     });

//   return updatedBooking;
// };

// ===================== Shared: void/refund a booking's Trusted Booking Fee =====================
// Used by both the parent/admin-triggered cancel flow and the auto-expire cron so the
// authorize-vs-capture branching only lives in one place.
const releaseBookingPayment = async (bookingId: any) => {
  const payment = await Payment.findOne({ booking: bookingId });
  if (!payment || !payment.stripePaymentIntentId) return;

  try {
    if (payment.status === 'authorized') {
      await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
      payment.status = 'failed';
      await payment.save();
    } else if (payment.status === 'completed') {
      await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
      });
      payment.status = 'refunded';
      await payment.save();
    }
  } catch (error) {
    console.error('Stripe refund/void failed for booking', bookingId, error);
    throw new AppError(
      502,
      `Releasing the payment failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }. Please contact support to resolve the refund.`,
    );
  }
};

// ===================== Cancel Booking =====================
const cancelBooking = async (id: string, userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid booking ID');
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'user is not found');

  const booking = await Booking.findById(id).populate({
    path: 'serviceId',
    select: 'userId',
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }

  // Authorization check
  if (user.role !== 'admin') {
    const isBookingOwner = booking.userId.toString() === userId;
    if (!isBookingOwner) {
      throw new AppError(403, 'You can only cancel your own bookings');
    }
  }

  // Check if already cancelled or completed
  if (booking.status === 'cancelled') {
    throw new AppError(400, 'Booking is already cancelled');
  }
  if (booking.status === 'completed') {
    throw new AppError(400, 'Cannot cancel completed booking');
  }

  // Update booking status
  booking.status = 'cancelled';
  await booking.save();

  // Update user's cancelled booking array
  user.cencleBooking = user.cencleBooking || [];
  if (!user.cencleBooking.includes(booking._id)) {
    user.cencleBooking.push(booking._id);
    await user.save();
  }

  // Release the payment hold or refund the captured Trusted Booking Fee.
  try {
    await releaseBookingPayment(booking._id);
  } catch (error) {
    throw new AppError(
      502,
      `Booking was cancelled, but ${
        error instanceof AppError ? error.message : 'releasing the payment failed'
      }`,
    );
  }

  try {
    const parentUser: any = await User.findById(booking.userId)
      .select('firstName lastName email')
      .lean();
    const serviceDoc: any = await Service.findById(
      (booking.serviceId as any)?._id || booking.serviceId,
    )
      .select('firstName lastName email userId')
      .lean();
    const emailDetails = buildBookingEmailDetails({
      ...booking.toObject(),
      userId: parentUser,
      serviceId: serviceDoc,
    });
    const bookingId = booking._id.toString();

    if (parentUser?.email) {
      const { subject, html } = bookingCancelledEmail(
        emailDetails,
        emailDetails.parentName,
      );
      await sendMailer(parentUser.email, subject, html);
    }
    if (parentUser?._id) {
      await notifyUser(parentUser._id.toString(), {
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        message: `Your booking with ${emailDetails.partnerName} on ${emailDetails.date} was cancelled.`,
        bookingId,
      });
    }
    if (serviceDoc?.email) {
      const { subject, html } = bookingCancelledEmail(
        emailDetails,
        emailDetails.partnerName,
      );
      await sendMailer(serviceDoc.email, subject, html);
    }
    if (serviceDoc?.userId) {
      await notifyUser(serviceDoc.userId.toString(), {
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        message: `The booking with ${emailDetails.parentName} on ${emailDetails.date} was cancelled.`,
        bookingId,
      });
    }
  } catch (mailError) {
    console.error('Booking cancellation email failed:', mailError);
  }

  return booking;
};

// ===================== Delete Booking (Admin Only) =====================
const deleteBooking = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid booking ID');
  }

  const booking = await Booking.findByIdAndDelete(id);
  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }

  return booking;
};

// ===================== Get Booking Statistics =====================
const getBookingStats = async (userId?: string) => {
  let matchCondition: any = {};
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (user.role !== 'admin' && userId) {
    matchCondition = { userId };
  }

  const stats = await Booking.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const formattedStats = {
    total: 0,
    pending: 0,
    accepted: 0,
    completed: 0,
    cancelled: 0,
  };

  stats.forEach((stat) => {
    formattedStats[stat._id as keyof typeof formattedStats] = stat.count;
    formattedStats.total += stat.count;
  });

  return formattedStats;
};

// ===================== Get User Booking Management =====================
const getUserBookingManagement = async (options: IOption) => {
  const { page, limit, skip } = pagination(options);

  const pipeline: mongoose.PipelineStage[] = [
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'userId',
        as: 'bookings',
      },
    },
    {
      $addFields: {
        totalBooking: { $size: '$bookings' },
        completedBooking: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'completed'] },
            },
          },
        },
        cancelledBooking: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'cancelled'] },
            },
          },
        },
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        profileImage: 1,
        totalBooking: 1,
        completedBooking: 1,
        cancelledBooking: 1,
      },
    },
    { $skip: skip },
    { $limit: limit },
  ];

  const data = await User.aggregate(pipeline);

  const total = await User.countDocuments();

  return {
    data,
    meta: { total, page, limit },
  };
};

// ===================== Pricing Preview (server-computed so it always matches checkout) =====================
// Runs the exact same getBookingPricing() the real checkout uses, so the pre-checkout UI can
// never drift from what Stripe actually charges — including city/category overrides, which a
// client-side re-implementation would otherwise have to duplicate and could get out of sync.
const previewBookingPricing = async (
  userId: string | undefined,
  serviceId: string,
  durationHours: number,
) => {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new AppError(400, 'Invalid service ID');
  }

  const service = await Service.findById(serviceId).populate('userId').lean();
  if (!service) throw new AppError(404, 'Service not found');

  const provider: any = service.userId;
  const hourRate = Number(service.hourRate || 0);
  const safeDurationHours = Number(durationHours) > 0 ? Number(durationHours) : 1;

  const user = userId ? await User.findById(userId).lean() : { isSubscription: false };
  const cityName = provider?.city || service.location;

  const pricing = await getBookingPricing(
    user || { isSubscription: false },
    hourRate,
    safeDurationHours,
    service.categoryId,
    cityName,
  );

  // Always include the non-member baseline too, so the UI can show "members save $X"
  // without the frontend having to re-derive the city/category override chain itself.
  const nonMemberPricing = await getBookingPricing(
    { isSubscription: false },
    hourRate,
    safeDurationHours,
    service.categoryId,
    cityName,
  );

  return {
    ...pricing,
    nonMemberBookingFeePercent: nonMemberPricing.bookingFeePercent,
    nonMemberBookingFeeMinimum: nonMemberPricing.bookingFeeMinimum,
    nonMemberTrustedBookingFee: nonMemberPricing.trustedBookingFee,
  };
};

// ===================== Helper: booking end datetime (for cron scans) =====================
const getBookingEndDateTime = (booking: any): Date | null => {
  const endTime = booking.endTime || booking.time;
  const startMinutes = parseTimeToMinutes(booking.time);
  const endMinutes = parseTimeToMinutes(endTime);
  const endDate =
    booking.endDate ||
    (endMinutes !== null && startMinutes !== null && endMinutes <= startMinutes
      ? new Date(new Date(booking.date).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      : booking.date);
  const endsAt = new Date(`${endDate}T${endTime}`);
  return Number.isNaN(endsAt.getTime()) ? null : endsAt;
};

// ===================== Cron: auto-expire stale "pending" requests =====================
// A partner who never responds to a Request to Book must not indefinitely hold a parent's
// slot and payment authorization — matches the PDF's "Declined / expired" lifecycle row.
const autoExpireStaleRequests = async () => {
  const staleBookings = await Booking.find({
    status: 'pending',
    responseDeadline: { $lte: new Date() },
  })
    .populate({ path: 'userId', select: 'firstName lastName email' })
    .populate({ path: 'serviceId', select: 'firstName lastName email userId' });

  for (const booking of staleBookings) {
    try {
      booking.status = 'declined';
      await booking.save();

      await releaseBookingPayment(booking._id).catch((error) =>
        console.error('Auto-expire release payment failed:', error),
      );

      const parent: any = booking.userId;
      const emailDetails = buildBookingEmailDetails(booking);

      if (parent?.email) {
        const { subject, html } = bookingExpiredEmail(emailDetails);
        await sendMailer(parent.email, subject, html);
      }
      if (parent?._id) {
        await notifyUser(parent._id.toString(), {
          type: 'booking_expired',
          title: 'Booking request expired',
          message: `${emailDetails.partnerName} did not respond in time for ${emailDetails.date}.`,
          bookingId: booking._id.toString(),
        });
      }
    } catch (error) {
      console.error('Auto-expire failed for booking', booking._id, error);
    }
  }

  return { processed: staleBookings.length };
};

// ===================== Cron: auto-complete bookings past their care window =====================
const autoCompletePastBookings = async () => {
  const candidates = await Booking.find({
    status: { $in: ['confirmed', 'accepted'] },
  })
    .populate({ path: 'userId', select: 'firstName lastName email' })
    .populate({ path: 'serviceId', select: 'firstName lastName email' });

  const now = new Date();
  let completedCount = 0;

  for (const booking of candidates) {
    const endsAt = getBookingEndDateTime(booking);
    if (!endsAt || endsAt > now) continue;

    try {
      booking.status = 'completed';
      await booking.save();
      completedCount += 1;

      const parent: any = booking.userId;
      const emailDetails = buildBookingEmailDetails(booking);

      if (parent?.email) {
        const { subject, html } = bookingCompletedEmail(emailDetails);
        await sendMailer(parent.email, subject, html);
      }
      if (parent?._id) {
        await notifyUser(parent._id.toString(), {
          type: 'booking_completed',
          title: 'Booking completed',
          message: `Your booking with ${emailDetails.partnerName} is complete. Leave a review!`,
          bookingId: booking._id.toString(),
        });
      }
    } catch (error) {
      console.error('Auto-complete failed for booking', booking._id, error);
    }
  }

  return { processed: completedCount };
};

// ===================== Cron: send "upcoming" reminder ~24h before a confirmed booking =====================
const sendUpcomingReminders = async () => {
  const candidates = await Booking.find({
    status: { $in: ['confirmed', 'accepted'] },
    reminderSent: { $ne: true },
  })
    .populate({ path: 'userId', select: 'firstName lastName email' })
    .populate({ path: 'serviceId', select: 'firstName lastName email' });

  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  let sentCount = 0;

  for (const booking of candidates) {
    const startsAt = new Date(`${booking.date}T${booking.time}`);
    if (Number.isNaN(startsAt.getTime())) continue;

    const msUntilStart = startsAt.getTime() - now;
    if (msUntilStart <= 0 || msUntilStart > windowMs) continue;

    try {
      booking.reminderSent = true;
      await booking.save();
      sentCount += 1;

      const parent: any = booking.userId;
      const emailDetails = buildBookingEmailDetails(booking);

      if (parent?.email) {
        const { subject, html } = bookingReminderEmail(emailDetails);
        await sendMailer(parent.email, subject, html);
      }
      if (parent?._id) {
        await notifyUser(parent._id.toString(), {
          type: 'booking_reminder',
          title: 'Upcoming booking reminder',
          message: `Your booking with ${emailDetails.partnerName} is coming up on ${emailDetails.date}.`,
          bookingId: booking._id.toString(),
        });
      }
    } catch (error) {
      console.error('Reminder send failed for booking', booking._id, error);
    }
  }

  return { processed: sentCount };
};

export const bookingService = {
  previewBookingPricing,
  createBooking,
  getAllBooking,
  getSingleBooking,
  updateBooking,
  deleteBooking,
  getAllMyBooking,
  getMyServiceBookings,
  cancelBooking,
  getBookingStats,
  getUserBookingManagement,
  autoExpireStaleRequests,
  autoCompletePastBookings,
  sendUpcomingReminders,
};
