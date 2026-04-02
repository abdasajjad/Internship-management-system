const Application = require('../models/Application');
const Internship = require('../models/Internship');
const User = require('../models/User');
const { extractPdfText } = require('../utils/pdfExtractor');
const { analyzeResume } = require('../utils/geminiAI');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { generateInternshipCompletionCertificatePdf } = require('../utils/certificateGenerator');

// @desc    Apply for internship
// @route   POST /api/applications/:internshipId
// @access  Private (Student)
exports.applyForInternship = async (req, res) => {
    try {
        const { internshipId } = req.params;

        // Check if internship exists
        const internship = await Internship.findById(internshipId);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        if (internship.isClosed) {
            return res.status(400).json({ message: 'This internship is closed and no longer accepts applications' });
        }

        if (internship.deadlineAt) {
            const deadline = new Date(internship.deadlineAt);
            if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
                return res.status(400).json({ message: 'This internship deadline has passed and no longer accepts applications' });
            }
        }

        // Check if valid role
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can apply' });
        }

        // Department restriction: only students from the same department can apply.
        // Treat missing/"N/A" department on internship as open to all.
        const normalizeDept = (v) => String(v || '').trim().toLowerCase();
        const internshipDept = normalizeDept(internship.department);
        const student = await User.findById(req.user.id).select('department');
        const studentDept = normalizeDept(student?.department);
        const deptRestricted = internshipDept && internshipDept !== 'n/a';
        if (deptRestricted && !studentDept) {
            return res.status(400).json({
                message: 'Please update your department in profile before applying'
            });
        }
        if (deptRestricted && internshipDept !== studentDept) {
            return res.status(403).json({
                message: `Only ${internship.department} department students can apply for this internship`
            });
        }

        // Check if already applied
        const existingApplication = await Application.findOne({
            student: req.user.id,
            internship: internshipId
        });
        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this internship' });
        }

        // Handle resume from upload or body
        let resumeText = req.body.resumeText || null;
        const resumePath = req.file ? req.file.path : null;

        if (req.file) {
            try {
                // Extract text from PDF
                const fileBuffer = await fs.readFile(req.file.path);
                resumeText = await extractPdfText(fileBuffer);
            } catch (err) {
                console.warn('Warning: Could not extract PDF text:', err.message);
                // Continue without resume text extraction
            }
        }

        const application = new Application({
            student: req.user.id,
            internship: internshipId,
            internshipTitleSnapshot: internship.title,
            facultyIdSnapshot: internship.postedBy,
            resumeSnapshot: resumePath,
            resumeText: resumeText,
            // Status defaults to pending
        });

        await application.save();
        res.status(201).json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get my applications (Student)
// @route   GET /api/applications/my
// @access  Private (Student)
exports.getMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({ student: req.user.id })
            .populate('internship', 'title description requiredSkills company status')
            .sort({ appliedAt: -1 });

        // Backfill rejection reasons for already-rejected applications
        // that don't have AI gaps/recommendations persisted yet.
        // This ensures students can immediately see why they were rejected.
        const toBackfill = applications.filter(app =>
            app.status === 'rejected' &&
            (!Array.isArray(app.aiCons) || app.aiCons.length === 0)
        );

        // Avoid potentially heavy AI work for many rows at once.
        const MAX_BACKFILL = 3;
        let backfilled = 0;

        for (const app of toBackfill) {
            if (backfilled >= MAX_BACKFILL) break;
            if (!app.internship) continue;

            let resumeText = app.resumeText;
            if (!resumeText && app.resumeSnapshot) {
                try {
                    const fsSync = require('fs');
                    const resumeSnapshot = String(app.resumeSnapshot);
                    const backendRoot = path.join(__dirname, '../');
                    const candidatePath1 = path.join(backendRoot, resumeSnapshot);
                    const candidatePath2 = path.resolve(process.cwd(), resumeSnapshot);

                    let buffer = null;
                    if (fsSync.existsSync(candidatePath1)) {
                        buffer = await fs.readFile(candidatePath1);
                    } else if (fsSync.existsSync(candidatePath2)) {
                        buffer = await fs.readFile(candidatePath2);
                    }

                    if (buffer) {
                        resumeText = await extractPdfText(buffer);
                    }
                } catch (extractErr) {
                    console.error('Failed to extract resume for AI backfill:', extractErr.message);
                }
            }

            if (!resumeText) continue;

            try {
                const analysis = await analyzeResume(resumeText, {
                    title: app.internship.title,
                    description: app.internship.description,
                    requiredSkills: app.internship.requiredSkills
                });

                const updated = await Application.findByIdAndUpdate(
                    app._id,
                    {
                        $set: {
                            aiScore: analysis.score,
                            aiFeedback: analysis.summary,
                            aiPros: analysis.strengths || [],
                            aiCons: analysis.improvements || [],
                            aiAnalysis: analysis
                        }
                    },
                    { new: true }
                );

                if (!updated) {
                    console.warn(`AI backfill: application missing for id ${String(app._id)}`);
                    continue;
                }
                backfilled++;
            } catch (aiErr) {
                console.error('AI backfill failed:', aiErr.message);
                if (!app.aiFeedback) {
                    app.aiFeedback = 'Application was rejected due to internship requirements mismatch.';
                }
                if (!Array.isArray(app.aiCons) || app.aiCons.length === 0) {
                    app.aiCons = ['Resume does not sufficiently match required internship skills.'];
                }
                const fallback = {
                    aiFeedback: app.aiFeedback,
                    aiCons: app.aiCons
                };

                const updated = await Application.findByIdAndUpdate(
                    app._id,
                    { $set: fallback },
                    { new: true }
                );

                if (!updated) {
                    console.warn(`AI backfill (fallback): application missing for id ${String(app._id)}`);
                    continue;
                }
                backfilled++;
            }
        }

        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get applications for an internship (Faculty)
// @route   GET /api/applications/internship/:internshipId
// @access  Private (Faculty/Admin)
exports.getInternshipApplications = async (req, res) => {
    try {
        // Check ownership of internship
        const internship = await Internship.findById(req.params.internshipId);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const applications = await Application.find({ internship: req.params.internshipId })
            .populate('student', 'name email department resume')
            .sort({ appliedAt: -1 });
        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update application status (Approve/Reject)
// @route   PUT /api/applications/:id/status
// @access  Private (Faculty/Admin)
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'approved', 'rejected'

        const application = await Application.findById(req.params.id).populate('internship');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        // Check ownership
        // application.internship is populated, verify postedBy
        // However, internship is populated Object, so we need deeper population OR just check ID separately? 
        // Mongoose populate replaces ID with object. so application.internship.postedBy is needed.
        // Let's optimize: just find internship by ID if needed or trust the populate.
        // We didn't populate postedBy in the findById line. 

        // Efficient check:
        const internship = await Internship.findById(application.internship._id);

        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (application.status === 'cancelled') {
            return res.status(400).json({ message: 'This application has been cancelled by the student' });
        }

        // If faculty rejects, ensure student can see "reasons for rejection".
        // We generate the same AI analysis (gaps/improvements) used by the faculty.
        if (status === 'rejected' && (!Array.isArray(application.aiCons) || application.aiCons.length === 0)) {
            let resumeText = application.resumeText;

            // If resumeText wasn't persisted, extract it from the uploaded snapshot.
            if (!resumeText && application.resumeSnapshot) {
                try {
                    const fsSync = require('fs');
                    const resumeSnapshot = String(application.resumeSnapshot);
                    const backendRoot = path.join(__dirname, '../');
                    const candidatePath1 = path.join(backendRoot, resumeSnapshot);
                    const candidatePath2 = path.resolve(process.cwd(), resumeSnapshot);

                    let buffer = null;
                    if (fsSync.existsSync(candidatePath1)) {
                        buffer = await fs.readFile(candidatePath1);
                    } else if (fsSync.existsSync(candidatePath2)) {
                        buffer = await fs.readFile(candidatePath2);
                    }

                    if (buffer) {
                        resumeText = await extractPdfText(buffer);
                    }
                } catch (extractErr) {
                    console.error('Failed to extract resume for rejection reason:', extractErr.message);
                }
            }

            if (resumeText) {
                try {
                    const analysis = await analyzeResume(resumeText, {
                        title: internship.title,
                        description: internship.description,
                        requiredSkills: internship.requiredSkills
                    });

                    application.aiScore = analysis.score;
                    application.aiFeedback = analysis.summary;
                    application.aiPros = analysis.strengths || [];
                    application.aiCons = analysis.improvements || [];
                    application.aiAnalysis = analysis;
                } catch (aiErr) {
                    // Keep rejection, but still show something to the student.
                    console.error('AI analysis generation failed on rejection:', aiErr.message);
                    application.aiFeedback = application.aiFeedback || 'Application was rejected due to internship requirements mismatch.';
                    application.aiCons = application.aiCons && application.aiCons.length
                        ? application.aiCons
                        : ['Resume does not sufficiently match required internship skills.'];
                }
            }
        }

        application.status = status;
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Upload Certificate
// @route   POST /api/applications/:id/certificate
// @access  Private (Student)
exports.uploadCertificate = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        let responseApplication = application;

        if (application.student.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (application.status !== 'approved') {
            return res.status(400).json({ message: 'Internship not approved yet' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        application.certificate = req.file.path;
        application.certificateStatus = 'pending_verification';
        await application.save();

        // Automatically generate the internship completion certificate PDF for the student
        // once they have submitted their internship completion proof.
        // (Do not overwrite `application.certificate` / `certificateStatus` used for faculty verification.)
        if (!application.internshipCompletionCertificate) {
            const appForCert = await Application.findById(application._id)
                .populate('student', 'name email department')
                .populate('internship', 'title company location duration department description requiredSkills isCompleted completedAt completedByName completedByEmail');

            if (appForCert && appForCert.status === 'approved') {
                // Only generate internship completion certificates after faculty marks the internship completed.
                if (!appForCert.internship?.isCompleted) {
                    return res.json(responseApplication);
                }

                // Always (re)generate the internship completion certificate PDF so
                // updated templates/signature blocks are reflected immediately.
                const certDir = path.join('uploads', 'certificates');
                if (!fsSync.existsSync(certDir)) {
                    fsSync.mkdirSync(certDir, { recursive: true });
                }

                const fileName = `internship-completion-${appForCert._id}.pdf`;
                const outputPath = path.join(certDir, fileName);
                const outputPathForUrl = outputPath.replace(/\\/g, '/');

                const completedAt = appForCert.internship?.completedAt
                    ? new Date(appForCert.internship.completedAt)
                    : new Date();

                // Generate the certificate using the shared template function.
                await generateInternshipCompletionCertificatePdf({
                    outputPath,
                    certificateId: String(appForCert._id),
                    completedAt,
                    student: {
                        name: appForCert.student?.name,
                        email: appForCert.student?.email,
                        department: appForCert.student?.department
                    },
                    internship: {
                        title: appForCert.internship?.title,
                        company: appForCert.internship?.company
                    },
                    signedBy: {
                        name: appForCert.internship?.completedByName || undefined,
                        email: appForCert.internship?.completedByEmail || undefined
                    },
                    signedAt: completedAt
                });

                appForCert.completedAt = completedAt;
                appForCert.internshipCompletionCertificate = outputPathForUrl;
                await appForCert.save();
                responseApplication = appForCert;
            }
        }

        res.json(responseApplication);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc   Verify Certificate
// @route  PUT /api/applications/:id/verify-certificate
// @access Private (Faculty)
exports.verifyCertificate = async (req, res) => {
    try {
        const { status } = req.body; // 'verified', 'rejected'
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        const internship = await Internship.findById(application.internship);
        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        application.certificateStatus = status;
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Cancel own pending application (Student)
// @route   PUT /api/applications/:id/cancel
// @access  Private (Student)
exports.cancelMyApplication = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        if (application.student.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (application.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending applications can be cancelled' });
        }

        application.status = 'cancelled';
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Remove own application (Student)
// @route   DELETE /api/applications/:id
// @access  Private (Student)
exports.removeMyApplication = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        if (application.student.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await application.deleteOne();
        res.json({ message: 'Application removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Archive notifications for application (Student/Faculty)
// @route   PUT /api/applications/:id/archive-notification
// @access  Private
exports.archiveApplicationNotification = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        // Allow student to archive their own, or faculty to archive for their internships
        if (req.user.role === 'student' && application.student.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        application.notificationArchivedAt = new Date();
        await application.save();
        res.json({ message: 'Notification archived', application });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Archive multiple notifications (bulk clear)
// @route   POST /api/applications/archive-notifications/bulk
// @access  Private
exports.archiveNotificationsBulk = async (req, res) => {
    try {
        const { applicationIds, internshipIds } = req.body;

        if ((!applicationIds || applicationIds.length === 0) && (!internshipIds || internshipIds.length === 0)) {
            return res.status(400).json({ message: 'No applications or internships to archive' });
        }

        let result = { applications: 0, internships: 0 };

        // Archive applications
        if (applicationIds && applicationIds.length > 0) {
            const updateResult = await Application.updateMany(
                { _id: { $in: applicationIds } },
                { notificationArchivedAt: new Date() }
            );
            result.applications = updateResult.modifiedCount;
        }

        // Archive internships
        if (internshipIds && internshipIds.length > 0) {
            const updateResult = await Internship.updateMany(
                { _id: { $in: internshipIds } },
                { notificationArchivedAt: new Date() }
            );
            result.internships = updateResult.modifiedCount;
        }

        res.json({ message: 'Notifications archived', result });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Generate internship completion certificate (student)
// @route   POST /api/applications/:id/complete
// @access  Private (Student)
exports.generateCompletionCertificate = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('student', 'name email department')
            .populate('internship', 'title company location duration department description requiredSkills isCompleted completedAt completedByName completedByEmail');

        if (!application) return res.status(404).json({ message: 'Application not found' });
        if (application.student.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

        // Only after approval (internship accepted/completed by student workflow)
        if (application.status !== 'approved') {
            return res.status(400).json({ message: 'Internship must be approved before completion.' });
        }

        if (!application.internship?.isCompleted) {
            return res.status(400).json({ message: 'Internship completion certificate can only be generated after faculty marks the internship completed.' });
        }

        // Always (re)generate here so students can get the latest certificate template/signature.

        const certDir = path.join('uploads', 'certificates');
        if (!fsSync.existsSync(certDir)) {
            fsSync.mkdirSync(certDir, { recursive: true });
        }

        const fileName = `certificate-${application._id}.pdf`;
        const outputPath = path.join(certDir, fileName);
        const outputPathForUrl = outputPath.replace(/\\/g, '/');

        const completedAt = application.internship?.completedAt ? new Date(application.internship.completedAt) : new Date();
        await generateInternshipCompletionCertificatePdf({
            outputPath,
            certificateId: String(application._id),
            completedAt,
            student: {
                name: application.student?.name,
                email: application.student?.email,
                department: application.student?.department
            },
            internship: {
                title: application.internship?.title,
                company: application.internship?.company
            },
            signedBy: {
                name: application.internship?.completedByName || undefined,
                email: application.internship?.completedByEmail || undefined
            },
            signedAt: completedAt
        });

        application.completedAt = completedAt;
        application.internshipCompletionCertificate = outputPathForUrl;
        await application.save();

        res.json(application);
    } catch (err) {
        console.error('Failed to generate certificate:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
