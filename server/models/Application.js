const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    internship: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Internship',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    resumeSnapshot: {
        type: String // Capture resume at time of application if needed, or link to user profile resume
    },
    certificate: {
        type: String // URL to uploaded completion certificate
    },
    certificateStatus: {
        type: String,
        enum: ['not_uploaded', 'pending_verification', 'verified', 'rejected'],
        default: 'not_uploaded'
    }
});

module.exports = mongoose.model('Application', applicationSchema);
