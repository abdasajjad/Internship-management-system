const Internship = require('../models/Internship');
const Application = require('../models/Application');
const User = require('../models/User');
const path = require('path');
const fsSync = require('fs');
const { generateInternshipCompletionCertificatePdf } = require('../utils/certificateGenerator');

// Multer provides either relative paths like `uploads/<file>.pdf` or absolute paths
// (especially on Windows). We normalize to a URL path that matches:
//   app.use('/uploads', express.static('uploads'))
const toUploadsUrlPath = (filePath) => {
    if (!filePath) return null;
    const normalized = String(filePath).replace(/\\/g, '/');
    const uploadsIdx = normalized.lastIndexOf('uploads/');
    if (uploadsIdx !== -1) return normalized.slice(uploadsIdx);

    // Fall back to last path segment + `uploads/`
    const fileName = path.basename(normalized);
    return fileName ? `uploads/${fileName}` : null;
};

// @desc    Create new internship
// @route   POST /api/internships
// @access  Private (Faculty/Admin)
exports.createInternship = async (req, res) => {
    try {
        // When posting via multipart/form-data, arrays arrive as strings.
        let requiredSkills = req.body.requiredSkills;
        if (typeof requiredSkills === 'string') {
            const trimmed = requiredSkills.trim();
            // Accept both: "a,b,c" and '["a","b"]'
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) requiredSkills = parsed;
            } catch (e) {
                // ignore JSON parse errors; fall back to CSV split below
            }

            if (typeof requiredSkills === 'string') {
                requiredSkills = trimmed
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
            }
        }

        // deadlineAt is required and should include time (from `datetime-local`),
        // but we still support date-only (`YYYY-MM-DD`) by treating it as end-of-day.
        let deadlineAt = req.body.deadlineAt;
        if (!deadlineAt) {
            return res.status(400).json({ message: 'Internship deadlineAt is required.' });
        }

        if (typeof deadlineAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deadlineAt)) {
            const [y, m, d] = deadlineAt.split('-').map(n => Number(n));
            deadlineAt = new Date(y, m - 1, d, 23, 59, 59, 999);
        } else if (typeof deadlineAt === 'string') {
            // For `YYYY-MM-DDTHH:mm` (datetime-local) we rely on JS Date parsing as local time.
            deadlineAt = new Date(deadlineAt);
        }

        if (deadlineAt instanceof Date && Number.isNaN(deadlineAt.getTime())) {
            return res.status(400).json({ message: 'Invalid deadlineAt value.' });
        }

        const internship = new Internship({
            ...req.body,
            requiredSkills,
            brochureSnapshot: req.file
                ? toUploadsUrlPath(req.file.path)
                : (req.body.brochureSnapshot ? toUploadsUrlPath(req.body.brochureSnapshot) : null),
            deadlineAt,
            postedBy: req.user.id
        });
        await internship.save();
        res.status(201).json(internship);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all internships
// @route   GET /api/internships
// @access  Private (Student/Faculty/Admin)
exports.getInternships = async (req, res) => {
    try {
        // Basic filtering
        const { department, company, duration } = req.query;
        let query = {};
        if (department) query.department = department;
        if (company) query.company = { $regex: company, $options: 'i' };
        if (duration) query.duration = duration;

        const internships = await Internship.find(query).populate('postedBy', 'name email');
        res.json(internships);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get internship by ID
// @route   GET /api/internships/:id
// @access  Private
exports.getInternshipById = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id).populate('postedBy', 'name email');
        if (!internship) return res.status(404).json({ message: 'Internship not found' });
        res.json(internship);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Internship not found' });
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update internship
// @route   PUT /api/internships/:id
// @access  Private (Faculty/Admin)
exports.updateInternship = async (req, res) => {
    try {
        let internship = await Internship.findById(req.params.id);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        // Ensure user is owner or admin
        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // When posting via multipart/form-data, arrays arrive as strings.
        let requiredSkills = req.body.requiredSkills;
        if (typeof requiredSkills === 'string') {
            const trimmed = requiredSkills.trim();
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) requiredSkills = parsed;
            } catch (e) {
                // ignore JSON parse errors; fall back to CSV split below
            }

            if (typeof requiredSkills === 'string') {
                requiredSkills = trimmed
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
            }
        }

        const updatePayload = {
            ...req.body,
            requiredSkills
        };

        if (req.file) {
            updatePayload.brochureSnapshot = toUploadsUrlPath(req.file.path);
        }

        // Normalize deadlineAt if present
        if (typeof updatePayload.deadlineAt === 'string') {
            const v = updatePayload.deadlineAt;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                const [y, m, d] = v.split('-').map(n => Number(n));
                updatePayload.deadlineAt = new Date(y, m - 1, d, 23, 59, 59, 999);
            } else {
                // datetime-local (`YYYY-MM-DDTHH:mm`) or ISO strings
                const parsed = new Date(v);
                updatePayload.deadlineAt = Number.isNaN(parsed.getTime()) ? updatePayload.deadlineAt : parsed;
            }
        }

        internship = await Internship.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
        res.json(internship);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete internship
// @route   DELETE /api/internships/:id
// @access  Private (Faculty/Admin)
exports.deleteInternship = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        // Ensure user is owner or admin
        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Application.deleteMany({ internship: internship._id });
        await internship.deleteOne();
        res.json({ message: 'Internship removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Close internship
// @route   PUT /api/internships/:id/close
// @access  Private (Faculty/Admin)
exports.closeInternship = async (req, res) => {
    try {
        let internship = await Internship.findById(req.params.id);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        // Ensure user is owner or admin
        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Backward-compat: older internships may not have deadlineAt (added later).
        // Keep deadline required for new posts, but allow closing legacy records.
        if (!internship.deadlineAt) {
            internship.deadlineAt = new Date();
        }

        if (!internship.isClosed) {
            internship.isClosed = true;
            internship.closedAt = new Date();
            await internship.save();
        }

        res.json(internship);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark internship as completed (no new applications)
// @route   PUT /api/internships/:id/complete
// @access  Private (Faculty/Admin)
exports.completeInternship = async (req, res) => {
    try {
        let internship = await Internship.findById(req.params.id);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        // Ensure user is owner or admin
        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Backward-compat: older internships may not have deadlineAt (added later).
        // Keep deadline required for new posts, but allow completing legacy records.
        if (!internship.deadlineAt) {
            internship.deadlineAt = new Date();
        }

        if (!internship.isCompleted) {
            internship.isCompleted = true;
            internship.completedAt = new Date();
        }

        // Save the signer for digital signature (faculty/admin completing the internship).
        const signerUser = req.user?.id
            ? await User.findById(req.user.id).select('name email')
            : null;
        internship.completedBy = req.user?.id || internship.completedBy;
        internship.completedByName = signerUser?.name || internship.completedByName || null;
        internship.completedByEmail = signerUser?.email || internship.completedByEmail || null;

        // Also mark as closed so students cannot apply.
        internship.isClosed = true;
        internship.closedAt = internship.closedAt || new Date();

        await internship.save();

        // When faculty marks internship completed, generate completion certificates
        // only for students selected by faculty (Application.status === 'approved').
        const completedAt = internship.completedAt || new Date();
        const signedBy = {
            name: internship.completedByName || undefined,
            email: internship.completedByEmail || undefined
        };
        const certDir = path.join('uploads', 'certificates');
        if (!fsSync.existsSync(certDir)) {
            fsSync.mkdirSync(certDir, { recursive: true });
        }

        const approvedApps = await Application.find({
            internship: internship._id,
            status: 'approved'
        })
            .populate('student', 'name email department')
            .populate('internship', 'title company');

        for (const app of approvedApps) {
            const fileName = `internship-completion-${app._id}.pdf`;
            const outputPath = path.join(certDir, fileName);
            const outputPathForUrl = outputPath.replace(/\\/g, '/');
            await generateInternshipCompletionCertificatePdf({
                outputPath,
                certificateId: String(app._id),
                completedAt,
                student: {
                    name: app.student?.name,
                    email: app.student?.email,
                    department: app.student?.department
                },
                internship: {
                    title: app.internship?.title,
                    company: app.internship?.company
                },
                signedBy,
                signedAt: completedAt
            });

            app.completedAt = completedAt;
            app.internshipCompletionCertificate = outputPathForUrl;
            await app.save();
        }

        res.json(internship);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
