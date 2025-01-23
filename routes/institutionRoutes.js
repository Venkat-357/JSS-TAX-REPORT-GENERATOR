import express from 'express';
import { allowInstitutionUsers } from '../middleware/restrict_routes.js';
import upload from '../use_multer.js';
import { getInstitutionPage,
    getListPaymentDetailsInInstitutionPage, 
    getNewInstitutionPaymentDetailsPage,
    postNewInstitutionPaymentDetails,
    getModifyInstitutionPaymentDetailsPage,
    postModifyInstitutionPaymentDetails,
    getDeleteInstitutionPaymentDetailsPage,
    getComprehensiveReportInInstitutionPage,
    getLocalReportInInstitutionPage
} from '../controllers/institutionController.js';

const router = express.Router();

router.get('/institution', allowInstitutionUsers, getInstitutionPage);
router.get('/list_payment_details_in_institution', allowInstitutionUsers, getListPaymentDetailsInInstitutionPage);
router.get('/new_institution_payment_details', allowInstitutionUsers, getNewInstitutionPaymentDetailsPage);
router.post('/new_institution_payment_details', allowInstitutionUsers, upload.single('image'), postNewInstitutionPaymentDetails);
router.get('/modify_institution_payment_details', allowInstitutionUsers, getModifyInstitutionPaymentDetailsPage);
router.post('/modify_institution_payment_details', allowInstitutionUsers, upload.single('image'), postModifyInstitutionPaymentDetails);
router.get('/delete_institution_payment_details', allowInstitutionUsers, getDeleteInstitutionPaymentDetailsPage);
router.get('/comprehensive_report_institution', allowInstitutionUsers, getComprehensiveReportInInstitutionPage);
router.get('/local_report_institution', allowInstitutionUsers, getLocalReportInInstitutionPage);
export default router;