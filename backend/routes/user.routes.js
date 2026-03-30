const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth.middleware');
const { extractPdfText } = require('../utils/pdfExtractor');
const upload = require('../middleware/upload.middleware');
const fs = require('fs').promises;

// @desc    Get all users
// @route   GET /api/users
// @access  Public
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Upload resume PDF and extract text
// @route   POST /api/users/:id/resume
// @access  Private (Self/Admin)
router.post('/:id/resume', auth, upload.single('resume'), async (req, res) => {
    try {
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        let pdfBuffer;
        if (req.file) {
            if (req.file.mimetype !== 'application/pdf') {
                return res.status(400).json({ message: 'Only PDF files are allowed for resumes' });
            }
            pdfBuffer = await fs.readFile(req.file.path);
        } else {
            const { base64Pdf } = req.body;
            if (!base64Pdf) {
                return res.status(400).json({ message: 'PDF file is required' });
            }

            try {
                pdfBuffer = Buffer.from(base64Pdf, 'base64');
            } catch (err) {
                return res.status(400).json({ message: 'Invalid PDF payload format' });
            }
        }

        let text = '';
        try {
            text = await extractPdfText(pdfBuffer);
        } catch (err) {
            return res.status(422).json({
                message: 'Could not extract text from this PDF. Please upload a text-based (non-scanned, non-encrypted) PDF.',
                details: err.message
            });
        }

        if (!text || !text.trim()) {
            return res.status(422).json({ message: 'No readable text found in PDF. Please upload a text-based resume.' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { resumeText: text },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({
            message: 'Resume uploaded successfully',
            text,
            user
        });
    } catch (err) {
        console.error('Resume processing error:', err);
        return res.status(500).json({ message: err.message || 'Failed to process resume' });
    }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
