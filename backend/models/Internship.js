const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String
    },
    duration: {
        type: String
    },
    department: {
        type: String
    },
    // After this date/time, students should not be able to apply
    deadlineAt: {
        type: Date,
        required: true
    },
    requiredSkills: {
        type: [String],
        default: []
    },
    // PDF brochure provided by the company for this internship
    // Stored as a server-relative path like `uploads/<filename>.pdf`
    brochureSnapshot: {
        type: String,
        default: null
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isClosed: {
        type: Boolean,
        default: false
    },
    closedAt: {
        type: Date,
        default: null
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },
    // Faculty/Admin who marked this internship as completed (for certificate signing)
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    completedByName: {
        type: String,
        default: null
    },
    completedByEmail: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    notificationArchivedAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Internship', internshipSchema);
