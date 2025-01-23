import express from 'express';
import { allowAdmins } from '../middleware/restrict_routes.js';
import upload from '../use_multer.js';
import { getAdminPage, getlistAllDivisionUsersPage, getModifyDivisionUserPage,
    postModifyDivisionUser, getDeleteDivisionUserPage, getAllInstitutionUsersPage,
    getAllPaymentDetailsPage, getCreateNewDivisionPage, postCreateNewDivision,
    getNewAdminPaymentDetailsPage, postNewAdminPaymentDetails, getTransferAdminPaymentDetailsPage,
    postTransferAdminPaymentDetails, getComprehensiveReportAdminPage, getLocalReportAdminPage
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/admin', allowAdmins, getAdminPage);
router.get('/list_all_division_users', allowAdmins, getlistAllDivisionUsersPage);
router.get('/modify_division_user', allowAdmins, getModifyDivisionUserPage);
router.post('/modify_division_user', allowAdmins, postModifyDivisionUser);
router.get('/delete_division_user', allowAdmins, getDeleteDivisionUserPage);
router.get('/list_all_institution_users', allowAdmins, getAllInstitutionUsersPage);
router.get('/list_all_payment_details', allowAdmins, getAllPaymentDetailsPage);
router.get('/create_new_division', allowAdmins, getCreateNewDivisionPage);
router.post('/create_new_division', allowAdmins, postCreateNewDivision);
router.get('/new_admin_payment_details', allowAdmins, getNewAdminPaymentDetailsPage);
router.post('/new_admin_payment_details', allowAdmins, upload.single('image'), postNewAdminPaymentDetails);
router.get('/transfer_admin_payment_details', allowAdmins, getTransferAdminPaymentDetailsPage);
router.post('/transfer_admin_payment_details', allowAdmins, postTransferAdminPaymentDetails);
router.get('/comprehensive_report_admin', allowAdmins, getComprehensiveReportAdminPage);
router.get('/local_report_admin', allowAdmins, getLocalReportAdminPage);

export default router;