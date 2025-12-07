const express = require('express');
const router = express.Router();
const {
    applyForInternship,
    getMyApplications,
    getInternshipApplications,
    updateApplicationStatus,
    uploadCertificate,
    verifyCertificate
} = require('../controllers/application.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/:internshipId/apply', auth, upload.single('resume'), applyForInternship);
router.get('/my', auth, getMyApplications);
router.get('/internship/:internshipId', auth, authorize(['faculty', 'admin']), getInternshipApplications);
router.put('/:id/status', auth, authorize(['faculty', 'admin']), updateApplicationStatus);
router.post('/:id/certificate', auth, upload.single('certificate'), uploadCertificate);
router.put('/:id/certificate-verify', auth, authorize(['faculty', 'admin']), verifyCertificate);

module.exports = router;
