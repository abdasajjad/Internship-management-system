const express = require('express');
const router = express.Router();
const {
    applyForInternship,
    getMyApplications,
    getInternshipApplications,
    updateApplicationStatus,
    uploadCertificate,
    verifyCertificate,
    cancelMyApplication,
    removeMyApplication,
    archiveApplicationNotification,
    archiveNotificationsBulk
} = require('../controllers/application.controller');
const {
    analyzeApplication,
    generateInterviewQuestionsForApp,
    getApplicationAnalysis,
    recommendTopCandidates
} = require('../controllers/ai.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { generateCompletionCertificate } = require('../controllers/application.controller');

router.get('/', async (req, res) => {
    try {
        const Application = require('../models/Application');
        const applications = await Application.find().populate('student', 'name email department').populate('internship', 'title company');
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.post('/:internshipId/apply', auth, upload.single('resume'), applyForInternship);
router.get('/my', auth, getMyApplications);
router.get('/internship/:internshipId', auth, authorize(['faculty', 'admin']), getInternshipApplications);
router.put('/:id/status', auth, authorize(['faculty', 'admin']), updateApplicationStatus);
router.put('/:id/cancel', auth, authorize(['student']), cancelMyApplication);
router.delete('/:id', auth, authorize(['student']), removeMyApplication);
router.post('/:id/certificate', auth, upload.single('certificate'), uploadCertificate);
router.put('/:id/certificate-verify', auth, authorize(['faculty', 'admin']), verifyCertificate);
router.post('/:id/complete', auth, authorize(['student']), generateCompletionCertificate);

// AI Analysis routes
router.post('/internship/:internshipId/top-candidates', auth, authorize(['faculty', 'admin']), recommendTopCandidates);
router.post('/:applicationId/analyze', auth, authorize(['faculty', 'admin']), analyzeApplication);
router.post('/:applicationId/interview-questions', auth, authorize(['faculty', 'admin']), generateInterviewQuestionsForApp);
router.get('/:applicationId/analysis', auth, getApplicationAnalysis);

// Notification Archive routes
router.put('/:id/archive-notification', auth, archiveApplicationNotification);
router.post('/archive-notifications/bulk', auth, archiveNotificationsBulk);

module.exports = router;
