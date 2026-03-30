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
    internshipTitleSnapshot: {
        type: String
    },
    facultyIdSnapshot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    resumeSnapshot: {
        type: String // Capture resume at time of application or link to user profile resume
    },
    resumeText: {
        type: String // Extracted text from PDF
    },
    aiScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    aiFeedback: {
        type: String // Gemini AI generated feedback
    },
    aiPros: {
        type: [String], // Array of pros/strengths
        default: []
    },
    aiCons: {
        type: [String], // Array of cons/gaps
        default: []
    },
    aiAnalysis: {
        type: Object, // Detailed analysis from Gemini
        default: null
    },
    certificate: {
        type: String // URL to uploaded completion certificate
    },
    certificateStatus: {
        type: String,
        enum: ['not_uploaded', 'pending_verification', 'verified', 'rejected'],
        default: 'not_uploaded'
    },
    // PDF certificate generated for internship completion (separate from the student's uploaded proof)
    internshipCompletionCertificate: {
        type: String, // URL path like `uploads/certificates/...`
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    notificationArchivedAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Application', applicationSchema);
