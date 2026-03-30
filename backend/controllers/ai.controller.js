const Application = require('../models/Application');
const Internship = require('../models/Internship');
const { analyzeResume, generateInterviewQuestions } = require('../utils/geminiAI');
const { extractPdfText } = require('../utils/pdfExtractor');

/**
 * Analyze an application's resume with Gemini AI
 * @route POST /api/applications/:applicationId/analyze
 * @access Private (Admin/Faculty)
 */
exports.analyzeApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // Find the application with populated references
        const application = await Application.findById(applicationId)
            .populate('student', 'name email resume department')
            .populate('internship', 'title description requiredSkills');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check authorization (only admin/faculty can analyze)
        if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to analyze applications' });
        }

        // Get resume text (already extracted or use existing)
        let resumeText = application.resumeText;
        if (!resumeText && req.file) {
            // If file uploaded in request, extract from it
            resumeText = await extractPdfText(req.file.buffer);
        }

        if (!resumeText) {
            return res.status(400).json({ message: 'No resume text found for analysis' });
        }

        if (application.aiAnalysis && application.aiScore !== null) {
            return res.json({
                message: 'Application analysis loaded from cache',
                application,
                analysis: application.aiAnalysis,
                cached: true
            });
        }

        // Analyze with Gemini
        const analysis = await analyzeResume(resumeText, {
            title: application.internship.title,
            description: application.internship.description,
            requiredSkills: application.internship.requiredSkills
        });

        // Update application with AI analysis
        application.aiScore = analysis.score;
        application.aiFeedback = analysis.summary;
        application.aiPros = analysis.strengths || [];
        application.aiCons = analysis.improvements || [];
        application.aiAnalysis = analysis;
        await application.save();

        res.json({
            message: 'Application analyzed successfully',
            application,
            analysis
        });
    } catch (err) {
        console.error('Error analyzing application:', err.message);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
};

/**
 * Generate interview questions for an application
 * @route POST /api/applications/:applicationId/interview-questions
 * @access Private (Admin/Faculty)
 */
exports.generateInterviewQuestionsForApp = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const application = await Application.findById(applicationId)
            .populate('internship', 'title description requiredSkills');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (!application.resumeText) {
            return res.status(400).json({ message: 'No resume text found' });
        }

        const questions = await generateInterviewQuestions(application.resumeText, {
            title: application.internship.title,
            description: application.internship.description,
            requiredSkills: application.internship.requiredSkills
        });

        res.json({
            message: 'Interview questions generated successfully',
            questions
        });
    } catch (err) {
        console.error('Error generating interview questions:', err.message);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
};

/**
 * Get AI analysis for an application
 * @route GET /api/applications/:applicationId/analysis
 * @access Private
 */
exports.getApplicationAnalysis = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const application = await Application.findById(applicationId);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json({
            score: application.aiScore,
            feedback: application.aiFeedback,
            analysis: application.aiAnalysis
        });
    } catch (err) {
        console.error('Error retrieving analysis:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Recommend top N candidates for an internship
 * @route POST /api/applications/internship/:internshipId/recommend
 * @access Private (Faculty/Admin)
 */
exports.recommendTopCandidates = async (req, res) => {
    try {
        const { internshipId } = req.params;
        const n = parseInt(req.body.n) || 5;

        const internship = await Internship.findById(internshipId);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        // Ensure user is owner or admin
        if (internship.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to select candidates for this internship' });
        }

        const applications = await Application.find({ internship: internshipId })
            .populate('student', 'name email department');

        // Score only applications that are not already persisted with analysis.
        const scoredApplications = await Promise.all(applications.map(async (app) => {
             console.log(`Processing app ${app._id} for student ${app.student?.name}`);

             // Reuse persisted analysis to keep Best Applicants consistent with AI Match.
             if (typeof app.aiScore === 'number' && app.aiFeedback) {
                 console.log(`App ${app._id} already scored: ${app.aiScore}`);
                 return app;
             }

             try {
                 let resumeText = app.resumeText;

                 // If resumeText is missing but we have a snapshot file, extract it.
                 if (!resumeText && app.resumeSnapshot) {
                     const fs = require('fs');
                     const path = require('path');
                     const backendRoot = path.join(__dirname, '../');
                     const filePath = path.join(backendRoot, app.resumeSnapshot);
                     console.log(`Checking resume file at: ${filePath}`);

                     if (fs.existsSync(filePath)) {
                        const buffer = fs.readFileSync(filePath);
                        const { extractPdfText } = require('../utils/pdfExtractor');
                        resumeText = await extractPdfText(buffer);
                        console.log(`Extracted resume text length: ${resumeText?.length}`);

                        if (resumeText) {
                            resumeText = resumeText.replace(/\s+/g, ' ').trim();
                            app.resumeText = resumeText;
                        }
                     } else {
                         console.log(`Resume file NOT found at: ${filePath}. Current CWD: ${process.cwd()}`);

                         const cwdPath = path.resolve(process.cwd(), app.resumeSnapshot);
                         if (fs.existsSync(cwdPath)) {
                             console.log(`Found file at CWD path: ${cwdPath}`);
                             const buffer = fs.readFileSync(cwdPath);
                             const { extractPdfText } = require('../utils/pdfExtractor');
                             resumeText = await extractPdfText(buffer);
                             if (resumeText) app.resumeText = resumeText;
                         }
                     }
                 }

                 if (resumeText) {
                    const { analyzeResume } = require('../utils/geminiAI');
                    console.log(`Analyzing resume for app ${app._id}...`);
                    const analysis = await analyzeResume(resumeText, {
                        title: internship.title,
                        description: internship.description,
                        requiredSkills: internship.requiredSkills
                    });

                    app.aiScore = analysis.score;
                    app.aiFeedback = analysis.summary;
                    app.aiPros = analysis.strengths || [];
                    app.aiCons = analysis.improvements || [];
                    app.aiAnalysis = analysis;
                    await app.save();
                    console.log(`App ${app._id} scored: ${app.aiScore}`);
                 } else {
                     console.log(`No resume text available for app ${app._id}; leaving AI match unset.`);
                 }
             } catch (e) {
                 console.error(`Failed to analyze app ${app._id}:`, e.message);
                 // Do not persist fallback/error scoring. Keep as not matched.
             }

             return app;
        }));

        // Sort descending by score
        scoredApplications.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

        // Top N
        const topCandidates = scoredApplications.slice(0, n);

        res.json({
            count: topCandidates.length,
            limit: n,
            candidates: topCandidates.map(app => {
                const obj = app.toObject ? app.toObject() : app;
                // Ensure ephemeral fields are included if not saved
                if (app.aiScore !== undefined) obj.aiScore = app.aiScore;
                if (app.aiFeedback !== undefined) obj.aiFeedback = app.aiFeedback;
                if (app.aiPros !== undefined) obj.aiPros = app.aiPros;
                if (app.aiCons !== undefined) obj.aiCons = app.aiCons;
                return obj;
            })
        });

    } catch (err) {
        console.error('Error recommending candidates:', err);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
};
