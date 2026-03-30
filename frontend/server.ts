import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { users, internships, applications } from './src/store.js';

const rootEnvPath = path.resolve(process.cwd(), '.env');
const siblingRootEnvPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config({ path: siblingRootEnvPath });
}

// For ESM compatibility with pdf-parse
const pdfParse = (await import('pdf-parse')).default;

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini AI
const ai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// --- API Routes ---

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Signup
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters long' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must include uppercase, lowercase, number, and special character' });
  }

  if (role === 'student' && (!department || department.trim().length < 2)) {
    return res.status(400).json({ error: 'Department is required for students' });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  const newUser = { id: Date.now().toString(), name, email, password, role, department };
  users.push(newUser);
  res.status(201).json(newUser);
});

// Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Delete user (Admin)
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });
  
  users.splice(index, 1);
  res.json({ success: true });
});

// Upload and parse resume
app.post('/api/users/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const { base64Pdf } = req.body;
    
    if (!base64Pdf) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    const user = users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const buffer = Buffer.from(base64Pdf, 'base64');
    const data = await pdfParse(buffer);
    const text = data.text;

    // Save extracted text to user
    user.resumeText = text;

    res.json({ text, user });
  } catch (err) {
    console.error('PDF parsing error:', err);
    res.status(500).json({ error: 'Failed to parse PDF' });
  }
});

// Get all internships
app.get('/api/internships', (req, res) => {
  res.json(internships);
});

// Create internship (Faculty)
app.post('/api/internships', (req, res) => {
  const { title, description, facultyId, requiredSkills } = req.body;
  const newInternship = {
    id: Date.now().toString(),
    title,
    description,
    facultyId,
    requiredSkills,
    isClosed: false,
    createdAt: new Date().toISOString()
  };
  internships.push(newInternship);
  res.status(201).json(newInternship);
});

// Get applications
app.get('/api/applications', (req, res) => {
  res.json(applications);
});

// Apply for internship (Student)
app.post('/api/applications', async (req, res) => {
  const { studentId, internshipId, resumeText } = req.body;
  
  const newApp = {
    id: Date.now().toString(),
    studentId,
    internshipId,
    resumeText,
    status: 'pending' as const,
    aiScore: null,
    aiFeedback: null,
    appliedAt: new Date().toISOString()
  };
  
  applications.push(newApp);
  res.status(201).json(newApp);
});

// Update application status (Faculty)
app.put('/api/applications/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const appIndex = applications.findIndex(a => a.id === id);
  if (appIndex === -1) return res.status(404).json({ error: 'Not found' });
  
  applications[appIndex].status = status;
  res.json(applications[appIndex]);
});

// AI: Analyze Resume (Student)
app.post('/api/ai/analyze-resume', async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-preview',
      contents: `Analyze this resume and provide constructive feedback and suggestions for improvement. Be concise and professional.\n\nResume:\n${resumeText}`
    });
    
    res.json({ feedback: response.text });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// AI: Match Resume (Faculty)
app.post('/api/ai/match-resume', async (req, res) => {
  try {
    const { resumeText, internshipId } = req.body;
    const internship = internships.find(i => i.id === internshipId);
    
    if (!internship || !resumeText) {
      return res.status(400).json({ error: 'Missing internship or resume' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-preview',
      contents: `Rate this resume against the internship description. Provide a match score from 0 to 100 and a brief justification.\n\nInternship Description:\n${internship.description}\nRequired Skills: ${internship.requiredSkills.join(', ')}\n\nResume:\n${resumeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Match score from 0 to 100" },
            justification: { type: Type.STRING, description: "Brief justification for the score" }
          },
          required: ["score", "justification"]
        }
      }
    });
    
    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to match resume' });
  }
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
