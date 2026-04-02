const express = require('express');
const router = express.Router();
const {
    createInternship,
    getInternships,
    getInternshipById,
    updateInternship,
    deleteInternship,
    closeInternship,
    completeInternship
} = require('../controllers/internship.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/', auth, authorize(['faculty', 'admin']), upload.single('brochure'), createInternship);
router.get('/', getInternships);  // Public - anyone can browse
router.put('/:id/close', auth, authorize(['faculty', 'admin']), closeInternship);
router.put('/:id/complete', auth, authorize(['faculty', 'admin']), completeInternship);
router.get('/:id', getInternshipById);  // Public - anyone can view details
router.put('/:id', auth, authorize(['faculty', 'admin']), upload.single('brochure'), updateInternship);
router.delete('/:id', auth, authorize(['faculty', 'admin']), deleteInternship);

module.exports = router;
