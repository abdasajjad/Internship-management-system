const Application = require('../models/Application');
const Internship = require('../models/Internship');

// @desc    Apply for internship
// @route   POST /api/applications/:internshipId
// @access  Private (Student)
exports.applyForInternship = async (req, res) => {
    try {
        const { internshipId } = req.params;

        // Check if internship exists
        const internship = await Internship.findById(internshipId);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        // Check if valid role
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can apply' });
        }

        // Check if already applied
        const existingApplication = await Application.findOne({
            student: req.user.id,
            internship: internshipId
        });
        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this internship' });
        }

        // Handle resume from upload or profile
        // Assuming for now simple path storage. If file uploaded, req.file.path
        // If not uploaded, could be from user profile but let's assume they might upload here?
        // Requirement says "Student applies... Upload resume while applying"
        const resumePath = req.file ? req.file.path : null;

        const application = new Application({
            student: req.user.id,
            internship: internshipId,
            resumeSnapshot: resumePath
            // Status defaults to pending
        });

        await application.save();
        res.status(201).json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get my applications (Student)
// @route   GET /api/applications/my
// @access  Private (Student)
exports.getMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({ student: req.user.id })
            .populate('internship', 'title company status')
            .sort({ appliedAt: -1 });
        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
        res.status(500).send('Server Error');
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

        application.status = status;
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Upload Certificate
// @route   POST /api/applications/:id/certificate
// @access  Private (Student)
exports.uploadCertificate = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

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
        res.json(application);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
        res.status(500).send('Server Error');
    }
};
