const express = require('express');
const router = express.Router();
const { register, login, getMe, createUserByAdmin, changePassword, getSecurityQuestion, verifySecurityAnswer, resetPasswordWithSecurity } = require('../controllers/auth.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/signup', register);  // Alias for frontend compatibility
router.post('/admin/create-user', auth, authorize(['admin']), createUserByAdmin);
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/change-password', auth, changePassword);
router.post('/get-security-question', getSecurityQuestion);
router.post('/verify-security-answer', verifySecurityAnswer);
router.post('/reset-password-security', resetPasswordWithSecurity);

module.exports = router;
