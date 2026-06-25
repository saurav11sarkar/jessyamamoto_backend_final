import pick from '../../helper/pick';
import catchAsync from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendResponse';
import { AmbassadorService } from './ambassador.service';

const createAmbassador = catchAsync(async (req, res) => {
  const result = await AmbassadorService.createAmbassador(req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Ambassador created successfully', data: result });
});

const getAllAmbassadors = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['searchTerm', 'status', 'city', 'country']);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await AmbassadorService.getAllAmbassadors(filters, options);
  sendResponse(res, { statusCode: 200, success: true, message: 'Ambassadors retrieved successfully', meta: result.meta, data: result.data });
});

const getAmbassadorById = catchAsync(async (req, res) => {
  const result = await AmbassadorService.getAmbassadorById(req.params.id!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Ambassador retrieved successfully', data: result });
});

const getMyDashboard = catchAsync(async (req, res) => {
  const ambassador = await AmbassadorService.getAmbassadorByUserId(req.user.id);
  const result = await AmbassadorService.getAmbassadorDashboard(ambassador._id.toString());
  sendResponse(res, { statusCode: 200, success: true, message: 'Dashboard retrieved successfully', data: result });
});

const updateAmbassador = catchAsync(async (req, res) => {
  const result = await AmbassadorService.updateAmbassador(req.params.id!, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: 'Ambassador updated successfully', data: result });
});

const deleteAmbassador = catchAsync(async (req, res) => {
  const result = await AmbassadorService.deleteAmbassador(req.params.id!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Ambassador deleted successfully', data: result });
});

const assignToProvider = catchAsync(async (req, res) => {
  const { providerId, ambassadorId, reason } = req.body;
  const result = await AmbassadorService.assignAmbassadorToProvider(providerId, ambassadorId, req.user.id, reason || 'Manual assignment');
  sendResponse(res, { statusCode: 200, success: true, message: 'Ambassador assigned to provider successfully', data: result });
});

const getFounderBoard = catchAsync(async (req, res) => {
  const result = await AmbassadorService.getFounderAdminBoard();
  sendResponse(res, { statusCode: 200, success: true, message: 'Founder board retrieved successfully', data: result });
});

const getCommissionReport = catchAsync(async (req, res) => {
  const options = pick(req.query, ['limit', 'page']);
  const result = await AmbassadorService.getCommissionReport(req.params.id!, options);
  sendResponse(res, { statusCode: 200, success: true, message: 'Commission report retrieved', meta: result.meta, data: result.data });
});

const markCommissionPaid = catchAsync(async (req, res) => {
  const { paidAmount, payoutMethod } = req.body;
  const result = await AmbassadorService.markCommissionPaid(req.params.id!, paidAmount, payoutMethod);
  sendResponse(res, { statusCode: 200, success: true, message: 'Commission marked as paid', data: result });
});

const verifyReferralCode = catchAsync(async (req, res) => {
  const { code } = req.params;
  const result = await AmbassadorService.getAmbassadorByReferralCode(code!);
  sendResponse(res, { statusCode: 200, success: true, message: result ? 'Valid referral code' : 'Invalid referral code', data: result });
});

export const AmbassadorController = {
  createAmbassador,
  getAllAmbassadors,
  getAmbassadorById,
  getMyDashboard,
  updateAmbassador,
  deleteAmbassador,
  assignToProvider,
  getFounderBoard,
  getCommissionReport,
  markCommissionPaid,
  verifyReferralCode,
};
