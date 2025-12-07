const Internship = require('../models/Internship');

// @desc    Create new internship
// @route   POST /api/internships
// @access  Private (Faculty/Admin)
exports.createInternship = async (req, res) => {
    try {
        const internship = new Internship({
            ...req.body,
            postedBy: req.user.id
        });
        await internship.save();
        res.status(201).json(internship);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
        res.status(500).send('Server Error');
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
        res.status(500).send('Server Error');
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

        internship = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(internship);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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

        await internship.deleteOne();
        res.json({ message: 'Internship removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
