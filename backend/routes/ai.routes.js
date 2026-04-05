const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const AiCache = require('../models/AiCache');
const { analyzeResume } = require('../utils/geminiAI');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Used to invalidate cached AI payloads when we change response shaping/truncation rules.
const SUMMARY_PAYLOAD_VERSION = 'v3-more-bullets';

const buildCacheKey = (type, payload) => {
    const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');
    return `${type}:${hash}`;
};

const generateFallbackFeedback = (resumeText) => {
    const words = String(resumeText || '').trim().split(/\s+/).filter(Boolean);
    const length = words.length;
    const hasEmail = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(resumeText || '');
    const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText || '');
    const hasProjects = /project|projects/i.test(resumeText || '');
    const hasSkills = /skills?|javascript|typescript|react|node|python|java|sql|aws|docker/i.test(resumeText || '');
    const hasExperience = /experience|intern|work/i.test(resumeText || '');

    const suggestions = [];
    if (length < 180) suggestions.push('- Add more detail on projects, outcomes, and measurable impact.');
    if (!hasEmail || !hasPhone) suggestions.push('- Include complete contact details (professional email and phone number).');
    if (!hasSkills) suggestions.push('- Add a dedicated technical skills section with tools and frameworks.');
    if (!hasProjects) suggestions.push('- Add 2-3 project highlights with tech stack and results.');
    if (!hasExperience) suggestions.push('- Add internship/work experience bullets focused on achievements.');
    if (suggestions.length === 0) suggestions.push('- Resume structure looks solid; refine bullets with stronger action verbs and quantifiable outcomes.');

    return [
        'AI service is currently rate-limited, so this is a local fallback analysis.',
        '',
        `Resume length: ~${length} words.`,
        '',
        'Suggestions:',
        ...suggestions
    ].join('\n');
};

/**
 * AI: Analyze Resume
 * @route POST /api/ai/analyze-resume
 * @access Public
 */
router.post('/analyze-resume', async (req, res) => {
    const resumeText = req.body?.resumeText;
    try {
        if (!resumeText) {
            return res.status(400).json({ error: 'Resume text is required' });
        }

        const cacheKey = buildCacheKey('analyze-resume', {
            resumeText: String(resumeText || '').trim(),
            model: GEMINI_MODEL,
            summaryPayloadVersion: SUMMARY_PAYLOAD_VERSION
        });

        const cached = await AiCache.findOne({ key: cacheKey });
        if (cached) {
            return res.json({ ...cached.payload, cached: true });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'AI service not configured' });
        }

        // Keep analysis generic (no internship context) so students can see
        // improvement points immediately after upload.
        const analysis = await analyzeResume(resumeText, {
            title: 'Internship',
            requiredSkills: []
        });

        // Frontend expects `summary` and `improvements`.
        const payload = {
            ...analysis,
            feedback: analysis.summary || ''
        };
        await AiCache.findOneAndUpdate(
            { key: cacheKey },
            { key: cacheKey, type: 'analyze-resume', payload },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json(payload);
    } catch (error) {
        console.error('AI Error:', error);

        const message = String(error?.message || 'Unknown AI error');
        if (message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate limit')) {
            const fallbackText = generateFallbackFeedback(resumeText);
            const improvements = String(fallbackText)
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('- '))
                .slice(0, 5)
                .map(l => l.replace(/^-+\s?/, '').trim());

            const payload = {
                score: 50,
                summary: 'AI analysis is temporarily unavailable. Here are quick improvement suggestions.',
                strengths: [],
                improvements,
                recommendation: 'moderate_match',
                feedback: fallbackText,
                warning: 'Gemini quota exceeded. Returned fallback analysis.'
            };

            const cacheKey = buildCacheKey('analyze-resume', {
                resumeText: String(resumeText || '').trim(),
                model: GEMINI_MODEL,
                summaryPayloadVersion: SUMMARY_PAYLOAD_VERSION,
                fallback: true
            });

            await AiCache.findOneAndUpdate(
                { key: cacheKey },
                { key: cacheKey, type: 'analyze-resume', payload },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return res.status(200).json(payload);
        }

        return res.status(500).json({ error: 'Failed to analyze resume: ' + message });
    }
});

/**
 * AI: Match Resume to Internship
 * @route POST /api/ai/match-resume
 * @access Public
 */
router.post('/match-resume', async (req, res) => {
    try {
        const { resumeText, internshipTitle, internshipDescription, requiredSkills, applicationId } = req.body;
        
        if (!resumeText || !internshipTitle) {
            return res.status(400).json({ error: 'Resume text and internship details required' });
        }

        const cacheKey = buildCacheKey('match-resume', {
            resumeText: String(resumeText || '').trim(),
            internshipTitle: String(internshipTitle || '').trim(),
            internshipDescription: String(internshipDescription || '').trim(),
            requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : String(requiredSkills || '').split(',').map(s => s.trim()).filter(Boolean),
            model: GEMINI_MODEL,
            summaryPayloadVersion: SUMMARY_PAYLOAD_VERSION
        });

        const cached = await AiCache.findOne({ key: cacheKey });
        if (cached) {
            return res.json({ ...cached.payload, cached: true });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'AI service not configured' });
        }

        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const skillsStr = Array.isArray(requiredSkills) ? requiredSkills.join(', ') : requiredSkills || '';
        
        const prompt = `You are an internship advisor. Analyze this student resume for the "${internshipTitle}" position. Give a brief, concise assessment (max 2 sentences).

Internship: ${internshipTitle}
Description: ${internshipDescription}
Required Skills: ${skillsStr}

Resume:
${resumeText}

IMPORTANT: For strengths and improvements, provide SHORT and CRISP bullet points (3-5 words max per point).
Provide up to 5 strengths and up to 5 improvements. Be very concise and specific.

Respond with ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "score": 75,
  "summary": "Good match with relevant skills and experience",
  "strengths": [
    "Strong technical skills",
    "Relevant project experience",
    "Good communication"
  ],
  "improvements": [
    "Add internship work experience",
    "Improve leadership experience",
    "Expand specialization depth"
  ],
  "recommendation": "good_match"
}`;

        const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
        const response = await model.generateContent(prompt);
        let responseText = response.response.text().trim();
        
        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Try to parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            const normalizedResult = {
                score: Math.min(100, Math.max(0, result.score || 50)),
                // Do not hard-truncate the model summary; the prompt already limits length.
                summary: String(result.summary || 'Analysis complete').trim(),
                strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 5).map(s => String(s).substring(0, 45)) : [],
                improvements: Array.isArray(result.improvements) ? result.improvements.slice(0, 5).map(i => String(i).substring(0, 45)) : [],
                recommendation: result.recommendation || 'moderate_match'
            };
            await AiCache.findOneAndUpdate(
                { key: cacheKey },
                { key: cacheKey, type: 'match-resume', payload: normalizedResult },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Save to application if applicationId is provided
            if (applicationId) {
                try {
                    const Application = require('../models/Application');
                    const app = await Application.findById(applicationId);
                    if (app) {
                        app.aiScore = normalizedResult.score;
                        app.aiFeedback = normalizedResult.summary;
                        app.aiPros = normalizedResult.strengths || [];
                        app.aiCons = normalizedResult.improvements || [];
                        app.aiAnalysis = normalizedResult;
                        await app.save();
                    }
                } catch (dbErr) {
                    // Log but don't fail the request if database save fails
                    console.error('Failed to save AI analysis to application:', dbErr.message);
                }
            }

            return res.json(normalizedResult);
        }

        // Fallback with dummy strengths/improvements
        const fallback = {
            score: 50, 
            summary: 'Unable to parse AI response',
            strengths: ['Resume submitted and reviewed'],
            improvements: ['Could not analyze in detail'],
            recommendation: 'moderate_match'
        };

        await AiCache.findOneAndUpdate(
            { key: cacheKey },
            { key: cacheKey, type: 'match-resume', payload: fallback },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json(fallback);
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: 'Failed to match resume: ' + error.message });
    }
});

module.exports = router;
