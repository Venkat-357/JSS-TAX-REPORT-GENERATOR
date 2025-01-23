import express from 'express';

import { getLogin, getLogout, postLogin } from '../controllers/authController.js';

const router = express.Router();

router.get('/login', getLogin);
router.post('/login', postLogin);
router.get('/logout', getLogout);

export default router;