const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const getGeminiApiKey = () => {
    // Allow either env name to avoid config drift across routes.
    return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
};

const getGeminiClient = () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    // SDK expects a plain API key string, not an options object.
    return new GoogleGenerativeAI(apiKey);
};

const isQuotaError = (err) => {
    const status = err?.status;
    const msg = String(err?.message || '').toLowerCase();
    return status === 429 || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests');
};

const stripMarkdown = (text) => {
    if (!text) return text;
    // Remove bold (**text** or __text__)
    let result = String(text).replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
    // Remove italic (*text* or _text_)
    result = result.replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1');
    // Remove headers (#, ##, ###, etc.)
    result = result.replace(/^#+\s+(.+)$/gm, '$1');
    // Remove code formatting (`code`)
    result = result.replace(/`(.+?)`/g, '$1');
    return result;
};


/**
 * Score and analyze a resume against internship requirements
 * @param {string} resumeText - Extracted resume text
 * @param {Object} internship - Internship object with title, description, requiredSkills
 * @returns {Promise<Object>} Score and feedback from Gemini AI
 */
exports.analyzeResume = async (resumeText, internship) => {
    try {
        const gemini = getGeminiClient();

        const prompt = `You are an internship advisor. Analyze this student resume for the "${internship.title}" position. Give a brief, concise assessment (max 2 sentences).

Resume:
${resumeText}

Position Requirements:
${internship.requiredSkills?.join(', ') || 'Not specified'}

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

        const model = gemini.getGenerativeModel({ model: GEMINI_MODEL });
        const response = await model.generateContent(prompt);
        let text = response.response.text().trim();

        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('Response text:', text);
            throw new Error('Invalid JSON response from AI');
        }

        const analysis = JSON.parse(jsonMatch[0]);
        
        return {
            score: Math.min(100, Math.max(0, analysis.score || 50)),
            // Do not hard-truncate the model summary; the prompt already limits length.
            summary: String(analysis.summary || 'Analysis complete').trim(),
            strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5).map(s => String(s).substring(0, 45)) : [],
            improvements: Array.isArray(analysis.improvements) ? analysis.improvements.slice(0, 5).map(i => String(i).substring(0, 45)) : [],
            recommendation: analysis.recommendation || 'moderate_match'
        };
    } catch (err) {
        if (isQuotaError(err)) {
            throw new Error('AI analysis is temporarily unavailable due to quota limits. Please try again later.');
        }

        console.error('Error analyzing resume with Gemini:', err);
        throw new Error('Failed to analyze resume: ' + err.message);
    }
};

/**
 * Generate interview questions based on resume and internship
 * @param {string} resumeText - Extracted resume text
 * @param {Object} internship - Internship object
 * @returns {Promise<string[]>} Array of interview questions
 */
exports.generateInterviewQuestions = async (resumeText, internship) => {
    try {
        const gemini = getGeminiClient();

        const prompt = `Generate 5 interview questions for "${internship.title}" internship based on resume.

Resume: ${resumeText}

Skills: ${internship.requiredSkills?.join(', ') || 'Not specified'}

Return ONLY a JSON array, nothing else:
["Question 1?","Question 2?","Question 3?","Question 4?","Question 5?"]`;

        const model = gemini.getGenerativeModel({ model: GEMINI_MODEL });
        const response = await model.generateContent(prompt);
        let text = response.response.text().trim();

        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Try to parse as array
        try {
            const questions = JSON.parse(text);
            if (Array.isArray(questions) && questions.length > 0) {
                return questions;
            }
        } catch (parseErr) {
            console.error('Failed to parse questions JSON:', parseErr);
        }
    } catch (err) {
        if (isQuotaError(err)) {
            const skills = Array.isArray(internship?.requiredSkills) ? internship.requiredSkills : [];
            return [
                `Walk me through a project where you used ${skills[0] || 'a core required skill'} and explain the impact you delivered.`,
                `How does your previous experience align with the ${internship?.title || 'internship'} responsibilities?`,
                'Describe a challenging technical problem you solved and how you approached it step-by-step.',
                'How do you prioritize tasks when handling multiple deadlines in a team setting?',
                `What areas from this role's requirements (${skills.slice(0, 3).join(', ') || 'core skills'}) are you currently improving, and how?`
            ];
        }

        console.error('Error generating interview questions:', err);
        throw new Error('Failed to generate questions: ' + err.message);
    }
};
