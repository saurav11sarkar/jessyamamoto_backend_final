import AppError from '../../error/appError';
import pagination, { IOption } from '../../helper/pagenation';
import User from '../user/user.model';
import { IAmbassador } from './ambassador.interface';
import { Ambassador, AmbassadorCommission } from './ambassador.model';
import sendMailer from '../../helper/sendMailer';

const createAmbassador = async (payload: IAmbassador & { email: string; password: string; firstName: string; lastName: string }) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw new AppError(400, 'Email already registered');
  }

  payload.ambassadorId = payload.ambassadorId.replace(/\s+/g, '-').toUpperCase();
  payload.referralCode = payload.referralCode.replace(/\s+/g, '-').toUpperCase();

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    role: 'ambassador',
    verified: true,
    ambassadorId: payload.ambassadorId,
    referralCode: payload.referralCode,
  });

  const ambassador = await Ambassador.create({
    userId: user._id,
    ambassadorId: payload.ambassadorId,
    referralCode: payload.referralCode,
    assignedCity: payload.assignedCity,
    assignedCountry: payload.assignedCountry,
    languages: payload.languages,
    commissionRate: payload.commissionRate || 10,
    commissionType: payload.commissionType || 'percentage',
    commissionBase: 'platform_fee',
    commissionDuration: payload.commissionDuration || '12_months',
    commissionStartDate: payload.commissionStartDate || new Date(),
    commissionEndDate: payload.commissionEndDate,
    status: payload.status || 'active',
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    paymentMethod: payload.paymentMethod,
    internalNotes: payload.internalNotes,
  });

  const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.jetsetcares.org';
  const frontendUrl = process.env.FRONTEND_URL || 'https://jetsetcares.org';
  const referralLink = `${frontendUrl}/join/${payload.referralCode}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0A0A23; margin: 0;">Welcome to JetSet Cares!</h1>
        <p style="color: #3ee0cf; font-size: 16px; margin-top: 5px;">City Ambassador Program</p>
      </div>

      <p style="color: #333; font-size: 15px;">Hi <strong>${payload.firstName} ${payload.lastName}</strong>,</p>

      <p style="color: #333; font-size: 15px;">
        You have been added as a <strong>City Ambassador</strong> for
        <strong>${payload.assignedCity}, ${payload.assignedCountry}</strong>.
        Welcome to the JetSet Cares team!
      </p>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #0A0A23; margin-top: 0;">Your Login Details</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 140px;">Dashboard URL:</td>
            <td style="padding: 8px 0;"><a href="${dashboardUrl}/login" style="color: #3ee0cf;">${dashboardUrl}/login</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Email:</td>
            <td style="padding: 8px 0;"><strong>${payload.email}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Password:</td>
            <td style="padding: 8px 0;"><strong>${payload.password}</strong></td>
          </tr>
        </table>
      </div>

      <div style="background: #e8faf8; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #0A0A23; margin-top: 0;">Your Ambassador Details</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 140px;">Ambassador ID:</td>
            <td style="padding: 8px 0;"><strong>${payload.ambassadorId}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Referral Code:</td>
            <td style="padding: 8px 0;"><strong>${payload.referralCode}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Commission Rate:</td>
            <td style="padding: 8px 0;"><strong>${payload.commissionRate || 10}%</strong> of Trusted Booking Fees</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">City:</td>
            <td style="padding: 8px 0;"><strong>${payload.assignedCity}, ${payload.assignedCountry}</strong></td>
          </tr>
        </table>
      </div>

      <div style="background: #fff3e0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #0A0A23; margin-top: 0;">Your Referral Link</h3>
        <p style="color: #333; font-size: 14px; margin-bottom: 10px;">
          Share this link with providers to recruit them. They will be automatically tracked as your referral:
        </p>
        <div style="background: white; border: 2px solid #3ee0cf; border-radius: 8px; padding: 12px; text-align: center;">
          <a href="${referralLink}" style="color: #3ee0cf; font-size: 16px; font-weight: bold; text-decoration: none;">
            ${referralLink}
          </a>
        </div>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <a href="${dashboardUrl}/login"
           style="display: inline-block; background: #3ee0cf; color: white; text-decoration: none;
                  padding: 14px 40px; border-radius: 30px; font-size: 16px; font-weight: bold;">
          Login to Dashboard
        </a>
      </div>

      <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
        Please change your password after first login for security.<br>
        If you have questions, contact us at support@jetsetcares.org
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 11px; text-align: center;">
        JetSet Care, Ltd. | 3rd Floor, 45 Albemarle Street, Mayfair, London, W1S 4JL
      </p>
    </div>
  `;

  try {
    await sendMailer(
      payload.email,
      `Welcome to JetSet Cares - City Ambassador for ${payload.assignedCity}`,
      emailHtml,
    );
  } catch (error) {
    console.error('Failed to send ambassador welcome email:', error);
  }

  return { user, ambassador };
};

const getAllAmbassadors = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, status, city, country } = params;

  const andCondition: any[] = [];

  if (searchTerm) {
    andCondition.push({
      $or: ['assignedCity', 'assignedCountry', 'ambassadorId', 'referralCode'].map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  if (status) andCondition.push({ status });
  if (city) andCondition.push({ assignedCity: { $regex: city, $options: 'i' } });
  if (country) andCondition.push({ assignedCountry: { $regex: country, $options: 'i' } });

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Ambassador.find(whereCondition)
    .populate('userId', 'firstName lastName email profileImage')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any);

  const total = await Ambassador.countDocuments(whereCondition);

  return { data: result, meta: { total, page, limit } };
};

const getAmbassadorById = async (id: string) => {
  const result = await Ambassador.findById(id).populate('userId', 'firstName lastName email profileImage phone');
  if (!result) throw new AppError(404, 'Ambassador not found');
  return result;
};

const getAmbassadorByUserId = async (userId: string) => {
  const result = await Ambassador.findOne({ userId }).populate('userId', 'firstName lastName email profileImage');
  if (!result) throw new AppError(404, 'Ambassador not found');
  return result;
};

const getAmbassadorByReferralCode = async (code: string) => {
  const result = await Ambassador.findOne({ referralCode: { $regex: new RegExp(`^${code}$`, 'i') } })
    .populate('userId', 'firstName lastName email');
  return result;
};

const updateAmbassador = async (id: string, payload: Partial<IAmbassador>) => {
  const result = await Ambassador.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
    .populate('userId', 'firstName lastName email profileImage');
  if (!result) throw new AppError(404, 'Ambassador not found');
  return result;
};

const deleteAmbassador = async (id: string) => {
  const ambassador = await Ambassador.findById(id);
  if (!ambassador) throw new AppError(404, 'Ambassador not found');

  await Ambassador.findByIdAndDelete(id);
  await User.findByIdAndUpdate(ambassador.userId, { role: 'find care' });

  return ambassador;
};

const assignAmbassadorToProvider = async (providerId: string, ambassadorId: string, assignedBy: string, reason: string) => {
  const ambassador = await Ambassador.findById(ambassadorId);
  if (!ambassador) throw new AppError(404, 'Ambassador not found');

  const provider = await User.findByIdAndUpdate(
    providerId,
    {
      onboardedBy: ambassador.userId,
      onboardingSource: 'city_ambassador',
      referralCode: ambassador.referralCode,
    },
    { new: true },
  );

  if (!provider) throw new AppError(404, 'Provider not found');

  return { provider, ambassador, auditLog: { assignedBy, reason, date: new Date(), previousValue: 'None', newValue: `${ambassador.ambassadorId}` } };
};

const getAmbassadorDashboard = async (ambassadorId: string) => {
  const ambassador = await Ambassador.findById(ambassadorId).populate('userId', 'firstName lastName');
  if (!ambassador) throw new AppError(404, 'Ambassador not found');

  const providers = await User.find({ onboardedBy: ambassador.userId, role: 'find job' });
  const providerIds = providers.map(p => p._id);

  const totalReferred = providers.length;
  const pendingProviders = providers.filter(p => p.userStatus === 'panding').length;
  const approvedProviders = providers.filter(p => p.userStatus === 'approved').length;
  const rejectedProviders = providers.filter(p => p.userStatus === 'reject').length;
  const activeProviders = providers.filter(p => p.status === 'active' && p.userStatus === 'approved').length;

  const commissions = await AmbassadorCommission.find({ ambassadorId: ambassador._id });
  const totalCommissionEarned = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const paidCommission = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const unpaidCommission = totalCommissionEarned - paidCommission;
  const totalPlatformFees = commissions.reduce((sum, c) => sum + c.platformFee, 0);
  const totalBookingValue = commissions.reduce((sum, c) => sum + c.bookingAmount, 0);
  const completedBookings = commissions.length;

  return {
    ambassador,
    stats: {
      totalReferred,
      pendingProviders,
      approvedProviders,
      rejectedProviders,
      activeProviders,
      completedBookings,
      totalBookingValue: Math.round(totalBookingValue * 100) / 100,
      totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
      totalCommissionEarned: Math.round(totalCommissionEarned * 100) / 100,
      paidCommission: Math.round(paidCommission * 100) / 100,
      unpaidCommission: Math.round(unpaidCommission * 100) / 100,
    },
    providers,
  };
};

const getFounderAdminBoard = async () => {
  const ambassadors = await Ambassador.find({ status: { $ne: 'removed' } })
    .populate('userId', 'firstName lastName email');

  const board = await Promise.all(
    ambassadors.map(async (amb) => {
      const providers = await User.find({ onboardedBy: amb.userId, role: 'find job' });
      const commissions = await AmbassadorCommission.find({ ambassadorId: amb._id });

      return {
        ambassadorId: amb._id,
        ambassadorCode: amb.ambassadorId,
        name: `${(amb.userId as any).firstName} ${(amb.userId as any).lastName}`,
        city: amb.assignedCity,
        country: amb.assignedCountry,
        status: amb.status,
        commissionRate: amb.commissionRate,
        providersReferred: providers.length,
        providersApproved: providers.filter(p => p.userStatus === 'approved').length,
        providersActive: providers.filter(p => p.status === 'active' && p.userStatus === 'approved').length,
        completedBookings: commissions.length,
        platformFees: Math.round(commissions.reduce((s, c) => s + c.platformFee, 0) * 100) / 100,
        commissionOwed: Math.round(commissions.filter(c => c.status !== 'paid').reduce((s, c) => s + c.commissionAmount, 0) * 100) / 100,
        commissionPaid: Math.round(commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.paidAmount || 0), 0) * 100) / 100,
      };
    }),
  );

  return board;
};

const getCommissionReport = async (ambassadorId: string, options: IOption) => {
  const { page, limit, skip } = pagination(options);

  const commissions = await AmbassadorCommission.find({ ambassadorId })
    .populate('providerId', 'firstName lastName')
    .populate('bookingId')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await AmbassadorCommission.countDocuments({ ambassadorId });

  return { data: commissions, meta: { total, page, limit } };
};

const markCommissionPaid = async (commissionId: string, paidAmount: number, payoutMethod: string) => {
  const result = await AmbassadorCommission.findByIdAndUpdate(
    commissionId,
    { status: 'paid', paidAmount, paidDate: new Date(), payoutMethod },
    { new: true },
  );
  if (!result) throw new AppError(404, 'Commission record not found');
  return result;
};

export const AmbassadorService = {
  createAmbassador,
  getAllAmbassadors,
  getAmbassadorById,
  getAmbassadorByUserId,
  getAmbassadorByReferralCode,
  updateAmbassador,
  deleteAmbassador,
  assignAmbassadorToProvider,
  getAmbassadorDashboard,
  getFounderAdminBoard,
  getCommissionReport,
  markCommissionPaid,
};
