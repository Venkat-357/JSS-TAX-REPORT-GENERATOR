import express from 'express';
import { allowDivisionUsers } from '../middleware/restrict_routes.js';
import { getDivisionPage,
    getListInstitutionUsersInDivisionPage,
    getModifyInstitutionUsersPage,
    postModifyInstitutionUsers,
    getDeleteInstitutionPage,
    getListPaymentDetailsInDivisionPage,
    getApproveInstitutionPaymentDetailsPage,
    getCreateNewInstitutionPage,
    postCreateNewInstitution,
    getComprehensiveReportDivisionPage,
    getLocalReportDivisionPage
 } from '../controllers/divisionController.js';

const router = express.Router();

router.get('/division', allowDivisionUsers, getDivisionPage);
router.get('/list_institution_users_in_division', allowDivisionUsers, getListInstitutionUsersInDivisionPage);
router.get('/modify_institution_users', allowDivisionUsers, getModifyInstitutionUsersPage);
router.post('/modify_institution_users', allowDivisionUsers, postModifyInstitutionUsers);
router.get('/delete_institution', allowDivisionUsers, getDeleteInstitutionPage);
router.get('/list_payment_details_in_division', allowDivisionUsers, getListPaymentDetailsInDivisionPage);
router.get('/approve_institution_payment_details', allowDivisionUsers, getApproveInstitutionPaymentDetailsPage);
router.get('/create_new_institution', allowDivisionUsers, getCreateNewInstitutionPage);
router.post('/create_new_institution', allowDivisionUsers, postCreateNewInstitution);
router.get('/comprehensive_report_division', allowDivisionUsers, getComprehensiveReportDivisionPage);
router.get('/local_report_division',allowDivisionUsers,getLocalReportDivisionPage);

export default router;