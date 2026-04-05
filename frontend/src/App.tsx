import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { User, Internship, Application, Role } from './store';
import { Briefcase, User as UserIcon, LogOut, FileText, BrainCircuit, PlusCircle, Users, Sparkles, ArrowRight, UploadCloud, CheckCircle2, XCircle, Mail, Lock, GraduationCap, Trash2, Plus, AlertCircle, Bell } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ResumeAnalysisDashboard } from './components/ResumeAnalysisDashboard';  // ← ADD THIS LINE

// ...rest of code...

// --- UI Components ---

function Button({ className, variant = 'primary', size = 'md', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost', size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        {
          'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 focus:ring-indigo-500': variant === 'primary',
          'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500': variant === 'secondary',
          'border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-500 text-slate-700': variant === 'outline',
          'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500': variant === 'danger',
          'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900': variant === 'ghost',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
}

function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

function Badge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' | 'ai', className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", {
      'bg-slate-100 text-slate-700': variant === 'default',
      'bg-emerald-100 text-emerald-700': variant === 'success',
      'bg-amber-100 text-amber-700': variant === 'warning',
      'bg-rose-100 text-rose-700': variant === 'danger',
      'bg-violet-100 text-violet-700 border border-violet-200': variant === 'ai',
    }, className)}>
      {children}
    </span>
  );
}

const normalizeUser = (raw: any): User => ({
  id: raw?.id || raw?._id || '',
  name: raw?.name || 'Unknown User',
  role: raw?.role || 'student',
  email: raw?.email || '',
  department: raw?.department,
  resumeText: raw?.resumeText
});

const normalizeInternship = (raw: any): Internship => ({
  id: String(raw?.id || raw?._id || ''),
  title: raw?.title || 'Untitled Internship',
  company: raw?.company || '',
  description: raw?.description || '',
  location: raw?.location || '',
  duration: raw?.duration || '',
  department: raw?.department || '',
  facultyId: String(raw?.facultyId || raw?.postedBy?._id || raw?.postedBy?.id || raw?.postedBy || ''),
  requiredSkills: Array.isArray(raw?.requiredSkills) ? raw.requiredSkills : [],
  brochureSnapshot: (() => {
    const snapshot = raw?.brochureSnapshot;
    if (!snapshot) return null;
    // Multer may store absolute paths on Windows with backslashes.
    // We normalize to `uploads/<filename>` so the frontend can link to `/uploads/...`.
    const s = String(snapshot).replace(/\\/g, '/');
    const idx = s.lastIndexOf('uploads/');
    if (idx !== -1) return s.slice(idx);
    const fileName = s.split('/').filter(Boolean).pop();
    return fileName ? `uploads/${fileName}` : null;
  })(),
  deadlineAt: raw?.deadlineAt ? String(raw.deadlineAt) : '',
  isClosed: Boolean(raw?.isClosed),
  isCompleted: Boolean(raw?.isCompleted),
  completedAt: raw?.completedAt ? String(raw.completedAt) : null,
  completedByName: raw?.completedByName ?? null,
  completedByEmail: raw?.completedByEmail ?? null,
  notificationArchivedAt: raw?.notificationArchivedAt || null,
  createdAt: raw?.createdAt || new Date().toISOString()
});

const normalizeApplication = (raw: any): Application => ({
  id: String(raw?.id || raw?._id || ''),
  studentId: String(raw?.studentId || raw?.student?._id || raw?.student?.id || raw?.student || ''),
  internshipId: String(raw?.internshipId || raw?.internship?._id || raw?.internship?.id || raw?.internship || ''),
  internshipTitle: raw?.internshipTitleSnapshot || raw?.internship?.title || 'Internship',
  facultyIdSnapshot: String(raw?.facultyIdSnapshot || ''),
  internshipMissing: raw?.internship === null,
  resumeText: raw?.resumeText || '',
  status: raw?.status || 'pending',
  aiScore: raw?.aiScore ?? null,
  aiFeedback: raw?.aiFeedback ?? null,
  aiPros: Array.isArray(raw?.aiPros) ? raw.aiPros : [],
  aiCons: Array.isArray(raw?.aiCons) ? raw.aiCons : [],
  notificationArchivedAt: raw?.notificationArchivedAt || null,
  appliedAt: raw?.appliedAt || raw?.createdAt || new Date().toISOString(),
  certificate: raw?.certificate ?? null,
  certificateStatus: raw?.certificateStatus ?? null,
  internshipCompletionCertificate: raw?.internshipCompletionCertificate ?? null,
  completedAt: raw?.completedAt ?? null
});

const readJsonSafely = async (res: Response): Promise<any> => {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
};

const cleanAiText = (value?: string | null): string => {
  if (!value) return '';
  return String(value)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .trim();
};

// --- Change Password Modal ---



// --- Change Password Modal ---

function ChangePasswordModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
      });

      const data = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setSuccess(data.message);
      setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Change Password</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {newPassword && confirmPassword && newPassword === confirmPassword && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Passwords match
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100">
                  {success}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={onClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ForgotPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [step, setStep] = useState<'email' | 'question' | 'reset' | 'done'>('email');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('email');
    setError('');
    setSuccess('');
    setIsLoading(false);
  }, [isOpen]);

  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/get-security-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to get security question');
      setSecurityQuestion(String(data.securityQuestion || ''));
      setStep('question');
    } catch (err: any) {
      setError(err.message || 'Failed to get security question');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-security-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, securityAnswer })
      });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to verify security answer');
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to verify security answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      const res = await fetch('/api/auth/reset-password-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, confirmPassword })
      });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to reset password');
      setSuccess(data.message || 'Password reset successfully.');
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Forgot Password</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {step !== 'done' && (
              <p className="text-sm text-slate-600 mb-4">
                {step === 'email' && 'Enter your email to retrieve your security question.'}
                {step === 'question' && 'Answer your security question to continue.'}
                {step === 'reset' && 'Set a new password.'}
              </p>
            )}

            {step === 'email' && (
              <form onSubmit={handleGetQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="off"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Please wait...' : 'Continue'}
                  </Button>
                </div>
              </form>
            )}

            {step === 'question' && (
              <form onSubmit={handleVerifyAnswer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Security Question</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800">
                    {securityQuestion || 'Security question not loaded'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Security Answer</label>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={e => setSecurityAnswer(e.target.value)}
                    autoComplete="off"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your answer"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setStep('email')} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="off"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="New password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="off"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Confirm password"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100">
                    {success}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setStep('question')} className="flex-1" disabled={isLoading}>
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </div>
              </form>
            )}

            {step === 'done' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100">
                  {success || 'Password reset successfully.'}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={onClose} className="w-full">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// --- Screens ---

function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const emailToValidate = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailToValidate)) {
        throw new Error('Please enter a valid email address');
      }
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin ? { email, password } : {
        name,
        email,
        password,
        role,
        department: role === 'student' ? department : undefined,
        // Needed for the "Forgot password" flow.
        securityQuestion,
        securityAnswer
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await readJsonSafely(res);

      if (!res.ok) {
        // Check for both 'error' and 'message' keys for flexibility
        const errorMsg = data.error || data.message || 'Authentication failed';
        throw new Error(errorMsg);
      }

      if (isLogin) {
        // Extract user and token from response (response contains { token, user })
        const userData = data.user || data;
        onLogin({ ...userData, token: data.token });
      } else {
        setIsLogin(true);
        setError('Account created successfully. Please log in.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Pane - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/workspace/1920/1080?blur=4')] opacity-20 bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-violet-900/90" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">InternAI</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            The future of <br/><span className="text-indigo-300">internship management.</span>
          </h1>
          <p className="text-lg text-indigo-200/80">
            AI-powered resume analysis, smart matching, and seamless collaboration between students, faculty, and administration.
          </p>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isLogin ? 'Enter your details to access your account.' : 'Sign up to get started with InternAI.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {[
                    { id: 'student', icon: GraduationCap, label: 'Student' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as Role)}
                      className={cn(
                        "p-3 border rounded-xl flex flex-col items-center gap-2 transition-all",
                        role === r.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                          : "border-slate-200 hover:border-indigo-300 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <r.icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{r.label}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {role === 'student' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Security Question</label>
                    <input
                      type="text"
                      required
                      value={securityQuestion}
                      onChange={e => setSecurityQuestion(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g. What is your favorite teacher?"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Security Answer</label>
                    <input
                      type="text"
                      required
                      value={securityAnswer}
                      onChange={e => setSecurityAnswer(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter your answer"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="off"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="off"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {!isLogin && (
              <>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
            </Button>
          </form>

          <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function Layout({ user, onLogout, notifications = [], onClearNotifications, isChangePasswordOpen, onChangePasswordToggle, onPasswordChanged, children }: { user: User, onLogout: () => void, notifications?: { id: string; text: string; variant: 'success' | 'danger' | 'warning' }[], onClearNotifications?: () => void, isChangePasswordOpen: boolean, onChangePasswordToggle: () => void, onPasswordChanged: () => void, children: React.ReactNode }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    // Guard against cases where `user.id` isn't ready yet or stored value isn't valid JSON.
    const key = user?.id ? `notifications-read-${user.id}` : null;
    const saved = key ? localStorage.getItem(key) : null;
    if (!saved) return new Set();
    try {
      const parsed = JSON.parse(saved);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (showNotifications) {
      const newRead = new Set(readNotifications);
      notifications.forEach(n => newRead.add(n.id));
      setReadNotifications(newRead);
      localStorage.setItem(`notifications-read-${user.id}`, JSON.stringify(Array.from(newRead)));
    }
  }, [showNotifications, notifications, user.id, readNotifications]);

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">InternAI</span>
            </div>
            <div className="flex items-center space-x-6">
              {/* Floating Notifications (Student and Faculty) */}
              {(user.role === 'student' || user.role === 'faculty') && notifications.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                          <h3 className="font-semibold text-slate-900">Notifications</h3>
                          {notifications.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                await onClearNotifications?.();
                                setReadNotifications(new Set(notifications.map(n => n.id)));
                                localStorage.setItem(`notifications-read-${user.id}`, JSON.stringify(notifications.map(n => n.id)));
                                setShowNotifications(false);
                              }}
                              className="text-xs"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-2 p-3">
                          {notifications.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-6">No notifications</p>
                          ) : (
                            notifications.map(note => (
                              <div
                                key={note.id}
                                className={cn(
                                  "p-3 rounded-lg border text-sm transition-colors",
                                  note.variant === 'success' && 'bg-emerald-50 border-emerald-100 text-emerald-800',
                                  note.variant === 'danger' && 'bg-rose-50 border-rose-100 text-rose-800',
                                  note.variant === 'warning' && 'bg-amber-50 border-amber-100 text-amber-800'
                                )}
                              >
                                {note.text}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                  <span className="text-sm font-bold text-indigo-700">{user?.name?.charAt(0) || '?'}</span>
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <Link to={`/profile/${user.id}`} className="text-slate-400 hover:text-slate-600 transition-colors" title="Profile" aria-label="Profile">
                <UserIcon className="h-5 w-5" />
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 transition-colors" title="Log out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {children}
        </motion.div>
      </main>
    </div>
  );
}

function ProfilePage({ currentUser, onRequestChangePassword }: { currentUser: User; onRequestChangePassword: () => void }) {
  const params = useParams();
  const targetId = String((params as any).id || currentUser.id);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/users/${targetId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.message || data?.error || 'Failed to load profile');
          return;
        }
        setProfile(data);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-sm text-slate-600">
        Loading profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => window.history.back()}>
          ← Back
        </Button>
        <Card className="p-6 text-sm text-slate-600">{error || 'Profile not found.'}</Card>
      </div>
    );
  }

  const name = profile?.name || 'Unknown User';
  const email = profile?.email || '';
  const role = profile?.role || 'student';
  const department = profile?.department || 'N/A';
  const createdAt = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A';

  const resumeText = typeof profile?.resumeText === 'string' ? profile.resumeText : '';
  const resumePreview = resumeText
    ? resumeText.slice(0, 650) + (resumeText.length > 650 ? '...' : '')
    : '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-600 capitalize">{role}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
            <span className="text-lg font-bold text-indigo-700">{name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{name}</p>
            <p className="text-sm text-slate-600">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Role</p>
            <p className="font-semibold text-slate-900">{role}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Department</p>
            <p className="font-semibold text-slate-900">{department}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Joined</p>
            <p className="font-semibold text-slate-900">{createdAt}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Resume</p>
            <p className="font-semibold text-slate-900">{resumeText ? 'Uploaded' : 'Not uploaded'}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl sm:col-span-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Password</p>
              <p className="font-semibold text-slate-900">Update your password securely</p>
            </div>
            {String(targetId) === String(currentUser.id) ? (
              <Button variant="outline" onClick={onRequestChangePassword}>
                Change Password
              </Button>
            ) : (
              <span className="text-xs text-slate-500">Only you can change your password</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">Resume Text (preview)</p>
          {resumePreview ? (
            <pre className="text-xs whitespace-pre-wrap bg-white border border-slate-200 rounded-xl p-3 text-slate-700 overflow-auto max-h-64">
              {resumePreview}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">No resume text available.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// Student Dashboard
function StudentDashboard({ user, onUpdateUser, onNotificationsChange }: { user: User, onUpdateUser: (u: User) => void, onNotificationsChange?: (notifications: { id: string; text: string; variant: 'success' | 'danger' | 'warning' }[]) => void }) {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [resumeText, setResumeText] = useState(user.resumeText || '');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCompletionProof, setIsUploadingCompletionProof] = useState(false);
  const [completionProofFile, setCompletionProofFile] = useState<File | null>(null);
  const [analyzingAppId, setAnalyzingAppId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string; variant: 'success' | 'danger' | 'warning' }[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [aiAnalysisData, setAiAnalysisData] = useState<{
  score: number;
  summary: string;
  feedback?: string;
  strengths: string[];
  improvements: string[];
  recommendation?: string;
} | null>(null);

  // Quick (non-elaborate) improvements shown immediately after resume upload
  const [uploadedQuickAnalysis, setUploadedQuickAnalysis] = useState<{
    score: number | null;
    summary: string;
    improvements: string[];
  } | null>(null);
  const [isQuickAnalyzing, setIsQuickAnalyzing] = useState(false);

  // Certificate signing/verification details shown alongside the PDF link
  const [completionCertificateSignature, setCompletionCertificateSignature] = useState<{
    signerName: string;
    signedAt: string;
    verificationCode: string;
  } | null>(null);


  useEffect(() => {
    fetch('/api/internships')
      .then(r => r.json())
      .then(data => setInternships(Array.isArray(data) ? data.map(normalizeInternship) : []));
    // Use the authenticated endpoint so backend can backfill AI rejection reasons
    // for already-rejected applications (without requiring faculty to click "AI Match" first).
    const token = localStorage.getItem('token');
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/applications/my', { headers })
      .then(r => r.json())
      .then(data => {
        const normalizedApps = Array.isArray(data) ? data.map(normalizeApplication) : [];
        // `/api/applications/my` returns only the student's applications
        setApplications(normalizedApps);
      });
  }, [user.id]);

    // Calculate notifications about FACULTY ACTIONS (for students)
  useEffect(() => {
    const notificationsList: { id: string; text: string; variant: 'success' | 'danger' | 'warning' }[] = [];

    internships.forEach(internship => {
      // Skip archived notifications
      if (internship.notificationArchivedAt) return;

      if (internship.isCompleted) {
        notificationsList.push({
          id: `${internship.id}-completed`,
          text: `${internship.title} has been marked completed by faculty.`,
          variant: 'warning'
        });
      } else if (internship.isClosed) {
        notificationsList.push({
          id: `${internship.id}-closed`,
          text: `${internship.title} has been closed by faculty.`,
          variant: 'warning'
        });
      }
    });

    // Show notifications about internships the student has applied to
    applications.forEach(app => {
      if (app.notificationArchivedAt) return;

      const internship = internships.find(i => i.id === app.internshipId);
      const internshipTitle = internship?.title || app.internshipTitle || 'Internship';

      if (app.status === 'approved') {
        notificationsList.push({
          id: `${app.id}-approved`,
          text: `Your application for ${internshipTitle} has been approved.`,
          variant: 'success'
        });
      }

      if (app.status === 'rejected') {
        notificationsList.push({
          id: `${app.id}-rejected`,
          text: (() => {
            const reasons = (Array.isArray(app.aiCons) ? app.aiCons : [])
              .map(r => cleanAiText(r))
              .filter(Boolean)
              .slice(0, 2);
            const fallback = (!reasons.length && app.aiFeedback)
              ? cleanAiText(app.aiFeedback).slice(0, 140)
              : '';
            return reasons.length
              ? `Your application for ${internshipTitle} has been rejected. Reason: ${reasons.join(' • ')}`
              : fallback
                ? `Your application for ${internshipTitle} has been rejected. Reason: ${fallback}`
                : `Your application for ${internshipTitle} has been rejected.`;
          })(),
          variant: 'danger'
        });
      }

      if (app.internshipMissing || (app.internshipId && !internship)) {
        notificationsList.push({
          id: `${app.id}-removed`,
          text: `${internshipTitle} was removed after your application.`,
          variant: 'warning'
        });
      }
    });

    setNotifications(notificationsList);
    onNotificationsChange?.(notificationsList);
  }, [applications, internships, onNotificationsChange]);

  // Compute signature/verification summary to display when the student opens the certificate.
  useEffect(() => {
    let cancelled = false;

    const compute = async () => {
      if (!selectedApplicationId) {
        setCompletionCertificateSignature(null);
        return;
      }

      const app = applications.find(a => a.id === selectedApplicationId);
      if (!app?.internshipCompletionCertificate) {
        setCompletionCertificateSignature(null);
        return;
      }

      const internship = internships.find(i => i.id === app.internshipId);
      if (!internship) {
        setCompletionCertificateSignature(null);
        return;
      }

      const signerName = internship.completedByName || 'Faculty / Program Coordinator';
      const signerEmail = internship.completedByEmail || null;
      const parsedCompletedAt = internship.completedAt ? new Date(String(internship.completedAt)) : new Date();
      const sigDate = Number.isNaN(parsedCompletedAt.getTime()) ? new Date() : parsedCompletedAt;

      const verificationPayload = `${app.id}|${signerEmail || signerName}|${sigDate.toISOString()}`;

      try {
        if (!window.crypto?.subtle) {
          throw new Error('WebCrypto not available');
        }

        const digest = await window.crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(verificationPayload)
        );
        const hex = Array.from(new Uint8Array(digest))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        const verificationCode = hex.slice(0, 14).toUpperCase();

        if (!cancelled) {
          setCompletionCertificateSignature({
            signerName,
            signedAt: sigDate.toLocaleDateString(),
            verificationCode
          });
        }
      } catch {
        if (!cancelled) {
          setCompletionCertificateSignature({
            signerName,
            signedAt: sigDate.toLocaleDateString(),
            verificationCode: 'N/A'
          });
        }
      }
    };

    compute();

    return () => {
      cancelled = true;
    };
  }, [selectedApplicationId, applications, internships]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch(`/api/users/${user.id}/resume`, {
        method: 'POST',
        headers,
        body: formData
      });

      const raw = await res.text();
      let data: any = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error('Server returned an invalid response while uploading PDF. Please restart backend and try again.');
        }
      }

      if (!res.ok) {
        throw new Error(data.details ? `${data.message} (${data.details})` : (data.message || data.error || 'Failed to upload resume'));
      }

      const uploadedText = data.text || '';
      setResumeText(uploadedText);
      if (data.user) {
        onUpdateUser(normalizeUser(data.user));
      }

      // Show quick improvement points right after upload (no elaborate dashboard).
      setUploadedQuickAnalysis(null);
      setAiAnalysisData(null);
      setAiFeedback('');

      if (uploadedText.trim()) {
        setIsQuickAnalyzing(true);
        try {
          const quickRes = await fetch('/api/ai/analyze-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText: uploadedText })
          });
          const quickData = await readJsonSafely(quickRes);
          if (quickRes.ok && quickData) {
            setUploadedQuickAnalysis({
              score: typeof quickData.score === 'number' ? quickData.score : null,
              summary: quickData.summary || '',
              improvements: Array.isArray(quickData.improvements) ? quickData.improvements.slice(0, 5) : []
            });
          }
        } catch (aiErr) {
          // Resume upload should not fail if the quick AI suggestions fail.
          console.warn('Quick AI suggestions failed:', aiErr);
        } finally {
          setIsQuickAnalyzing(false);
        }
      }
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Resume upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const analyzeResume = async () => {
  if (!resumeText) return;
  setIsAnalyzing(true);
  try {
    const res = await fetch('/api/ai/analyze-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText })
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Failed to analyze resume');
    }

    if (data.warning) {
      alert(data.warning);
    }

    setAiFeedback(data.summary || 'No suggestions returned by AI.');
    
    // Set analysis data for graphical dashboard
    setAiAnalysisData({
      score: data.score || 75,
      summary: data.summary || '',
      feedback: data.feedback || '',
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      improvements: Array.isArray(data.improvements) ? data.improvements : [],
      recommendation: data.recommendation || 'moderate_match'
    });
  } catch (e) {
    console.error(e);
    alert((e as Error).message || 'Failed to analyze resume');
  } finally {
    setIsAnalyzing(false);
  }
};

  const apply = async () => {
    if (!selectedInternship || !resumeText) return;
    const deadlinePassed = Boolean(selectedInternship.deadlineAt) &&
      new Date(String(selectedInternship.deadlineAt)).getTime() < Date.now();
    if (deadlinePassed) {
      alert('This internship deadline has passed and no longer accepts applications.');
      return;
    }
    const completed = Boolean(selectedInternship.isCompleted);
    if (completed) {
      alert('This internship has been marked completed by the faculty.');
      return;
    }
    setIsApplying(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/applications/${selectedInternship.id}/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resumeText
        })
      });
      const newAppRaw = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(newAppRaw.message || newAppRaw.error || 'Failed to submit application');
      }

      const newApp = normalizeApplication(newAppRaw);
      setApplications(prev => [...prev, newApp]);
      setSelectedInternship(null);
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to submit application');
    } finally {
      setIsApplying(false);
    }
  };

  const runAiMatch = async (targetApp: Application, internship?: Internship) => {
    setAnalyzingAppId(targetApp.id);
    try {
      const res = await fetch('/api/ai/match-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: targetApp.id,
          resumeText: targetApp.resumeText,
          internshipTitle: internship?.title || targetApp.internshipTitle || 'Internship',
          internshipDescription: internship?.description || '',
          requiredSkills: internship?.requiredSkills || []
        })
      });
      const data = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to analyze AI match');
      }

      setApplications(apps => apps.map(a => a.id === targetApp.id ? {
        ...a,
        aiScore: data.score,
        aiFeedback: data.summary,
        aiPros: data.strengths,
        aiCons: data.improvements
      } : a));
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to analyze AI match');
    } finally {
      setAnalyzingAppId(null);
    }
  };

  const cancelApplication = async (applicationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/applications/${applicationId}/cancel`, {
        method: 'PUT',
        headers
      });
      const data = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel application');
      }

      setApplications(apps => apps.map(a => a.id === applicationId ? { ...a, status: 'cancelled' } : a));
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to cancel application');
    }
  };

  const removeApplication = async (applicationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'DELETE',
        headers
      });
      const data = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(data.message || 'Failed to remove application');
      }

      setApplications(apps => apps.filter(a => a.id !== applicationId));
      if (selectedApplicationId === applicationId) {
        setSelectedApplicationId(null);
      }
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to remove application');
    }
  };

  const completeInternship = async (applicationId: string) => {
    setIsGeneratingCertificate(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/applications/${applicationId}/complete`, {
        method: 'POST',
        headers
      });

      const data = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to generate certificate');
      }

      const normalized = normalizeApplication(data);
      setApplications(apps => apps.map(a => a.id === applicationId ? normalized : a));
      return normalized;
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to generate certificate');
      return null;
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  const uploadCompletionProof = async (applicationId: string) => {
    if (!completionProofFile) return;
    setIsUploadingCompletionProof(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append('certificate', completionProofFile);

      const res = await fetch(`/api/applications/${applicationId}/certificate`, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await readJsonSafely(res);
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to upload completion proof');
      }

      setApplications(apps => apps.map(a => a.id === applicationId ? normalizeApplication(data) : a));
      setCompletionProofFile(null);
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to upload completion proof');
    } finally {
      setIsUploadingCompletionProof(false);
    }
  };

  const getDisplayStatus = (app: Application, internship?: Internship) => {
    if (internship?.isCompleted) return 'completed';
    if (internship?.isClosed) return 'closed';
    return app.status;
  };

  if (selectedApplicationId) {
    const selectedApplication = applications.find(a => a.id === selectedApplicationId);
    if (!selectedApplication) {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedApplicationId(null)} className="px-2">
            ← Back
          </Button>
          <Card className="p-6 text-sm text-slate-600">Application not found.</Card>
        </div>
      );
    }
    const internship = internships.find(i => i.id === selectedApplication.internshipId);
    const detailStatus = getDisplayStatus(selectedApplication, internship);
    const canRemove = Boolean(internship?.isClosed || ['pending', 'rejected', 'cancelled'].includes(selectedApplication.status));

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedApplicationId(null)} className="px-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Application Details</h1>
        </div>

        <Card className="p-6 space-y-4">
          {internship ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h4 className="font-semibold text-slate-900">Internship Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Title:</span> {internship.title}</p>
                <p><span className="font-medium text-slate-900">Company:</span> {internship.company || 'N/A'}</p>
                <p><span className="font-medium text-slate-900">Location:</span> {internship.location || 'N/A'}</p>
                <p><span className="font-medium text-slate-900">Duration:</span> {internship.duration || 'N/A'}</p>
                <p><span className="font-medium text-slate-900">Department:</span> {internship.department || 'N/A'}</p>
                <p><span className="font-medium text-slate-900">Status:</span> {detailStatus}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 mb-1">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{internship.description || 'No description provided.'}</p>
              </div>
              {(internship.requiredSkills?.length || 0) > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-1">Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {internship.requiredSkills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              This internship post is no longer available. Showing application snapshot only.
            </div>
          )}

          {selectedApplication.aiScore !== null ? (
            <div className="p-5 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border border-violet-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-violet-300 flex items-center justify-center shadow-sm">
                    <span className="text-2xl font-bold text-violet-700">{selectedApplication.aiScore}%</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-violet-900">Match Score</h4>
                    <p className="text-xs text-violet-600 uppercase tracking-wide font-semibold">AI Analysis</p>
                  </div>
                </div>
              </div>

              {selectedApplication.aiFeedback && (
                <div className="text-base text-slate-700 leading-relaxed bg-white/60 rounded-lg p-3 border border-violet-200/50">
                  {cleanAiText(selectedApplication.aiFeedback)}
                </div>
              )}

              {(selectedApplication.aiPros?.length || 0) > 0 && (
                <div>
                  <h5 className="text-base font-bold text-emerald-700 mb-3">Strengths</h5>
                  <ol className="space-y-2 list-decimal list-inside">
                    {selectedApplication.aiPros.map((pro, i) => (
                      <li key={i} className="text-emerald-900 text-sm font-medium">
                        <p className="inline text-base text-emerald-900">{cleanAiText(pro)}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {(selectedApplication.aiCons?.length || 0) > 0 && (
                <div>
                  <h5 className="text-base font-bold text-rose-700 mb-3">Gaps & Recommendations</h5>
                  <ul className="space-y-2 list-disc list-inside">
                    {selectedApplication.aiCons.map((con, i) => (
                      <li key={i} className="text-rose-900">
                        <p className="inline text-base text-rose-900">{cleanAiText(con)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => runAiMatch(selectedApplication, internship)}
                disabled={analyzingAppId === selectedApplication.id}
              >
                {analyzingAppId === selectedApplication.id ? 'Analyzing...' : <><Sparkles className="w-4 h-4 mr-1.5" /> Get AI Match</>}
              </Button>
            </div>
          )}

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-base font-bold text-slate-900">Completion Certificate</h5>
              {selectedApplication.internshipCompletionCertificate && (
                <Badge
                  variant={
                    'success'
                  }
                >
                  Generated
                </Badge>
              )}
            </div>

            {selectedApplication.internshipCompletionCertificate ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {completionCertificateSignature && (
                  <div className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-600">
                      Digitally signed by <span className="font-semibold text-slate-900">{completionCertificateSignature.signerName}</span>
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Signed on <span className="font-medium text-slate-900">{completionCertificateSignature.signedAt}</span>
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Verification Code: <span className="font-mono font-semibold text-slate-900">{completionCertificateSignature.verificationCode}</span>
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const certPath = selectedApplication.internshipCompletionCertificate;
                    if (!certPath) return;

                    // The certificate already exists; just open it.
                    // (Regenerating calls a protected endpoint and can show a
                    // misleading "Not authorized" toast even though viewing works.)
                    window.open(`/${certPath}`, '_blank', 'noopener,noreferrer');
                  }}
                  disabled={isGeneratingCertificate}
                  className="block w-full text-center text-sm font-medium py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
                >
                  {isGeneratingCertificate ? 'Generating...' : 'View Certificate (PDF)'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Your internship completion certificate will be generated after the faculty marks the internship as completed.
                </p>

                {selectedApplication.status === 'approved' && internship?.isCompleted ? (
                  <Button
                    onClick={() => completeInternship(selectedApplication.id)}
                    disabled={isGeneratingCertificate}
                    className="w-full"
                    size="sm"
                  >
                    {isGeneratingCertificate ? 'Generating...' : 'Generate & Download'}
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" className="w-full" disabled>
                    Waiting for faculty completion
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            {selectedApplication.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => cancelApplication(selectedApplication.id)}>
                Cancel Application
              </Button>
            )}
            {canRemove && (
              <Button size="sm" variant="danger" onClick={() => removeApplication(selectedApplication.id)}>
                Remove Application
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (selectedInternship) {
    const deadlinePassed = Boolean(selectedInternship.deadlineAt) &&
      new Date(String(selectedInternship.deadlineAt)).getTime() < Date.now();
    const completed = Boolean(selectedInternship.isCompleted);
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedInternship(null)} className="px-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Apply for {selectedInternship.title}</h1>
        </div>

        <Card className="p-8 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirm Application</h3>
            <p className="text-sm text-slate-600 mb-4">
              You are applying for the <strong>{selectedInternship.title}</strong> position.
            </p>
            {resumeText ? (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-800 flex items-start">
                <CheckCircle2 className="w-5 h-5 mr-3 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Resume Ready</p>
                  <p className="text-indigo-700/80">Your uploaded resume will be submitted with this application.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800 flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Resume Required</p>
                  <p className="text-amber-700/80">Please go back and upload your resume in the AI Analyzer section before applying.</p>
                </div>
              </div>
            )}
          </div>

          {deadlinePassed && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
              This internship deadline has passed, so you cannot apply.
            </div>
          )}
          {completed && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
              This internship has been marked completed by the faculty, so you cannot apply.
            </div>
          )}

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-100">
            <Button onClick={apply} disabled={isApplying || !resumeText || deadlinePassed || completed} size="lg">
              {isApplying ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Applications Overview */}
      {applications.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Your Applications</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {applications.map(app => {
              const internship = internships.find(i => i.id === app.internshipId);
              const statusValue = getDisplayStatus(app, internship);
              const canRemove = Boolean(internship?.isClosed || ['pending', 'rejected', 'cancelled'].includes(app.status));
              return (
                <Card key={app.id} className="p-0 overflow-hidden max-w-md w-full">
                  <div>
                    <button
                      className="w-full text-left p-4 min-h-[150px] flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setSelectedApplicationId(app.id);
                        // If the saved AI feedback looks like it was hard-truncated,
                        // auto-refresh it so the full sentence is shown without a button.
                        const feedback = app.aiFeedback;
                        const looksHardTruncated = typeof feedback === 'string'
                          && feedback.length >= 190
                          && !/[.!?]$/.test(feedback.trim());
                        // Old backend limited both positives/negatives to exactly 3 items.
                        // Trigger one auto-refresh when both are still at that old limit.
                        const looksOldBulletLimit = (app.aiPros?.length ?? 0) === 3 && (app.aiCons?.length ?? 0) === 3;
                        if ((looksHardTruncated || looksOldBulletLimit) && app.aiScore !== null && analyzingAppId !== app.id) {
                          runAiMatch(app, internship);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900 truncate">{internship?.title || app.internshipTitle || 'Unknown Role'}</h3>
                          <p className="text-xs text-slate-500 mt-1">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                          <p className="text-[11px] text-slate-500 mt-4">Tap to open full page</p>
                        </div>
                      </div>
                      <Badge variant={
                        statusValue === 'approved' ? 'success' :
                        statusValue === 'rejected' ? 'danger' :
                        statusValue === 'completed' ? 'ai' : 'warning'
                      }>
                        {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                      </Badge>
                    </button>

                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 flex items-center justify-between gap-3">
                      {app.aiScore !== null ? (
                        <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1">
                          AI Match {app.aiScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">No AI match yet</span>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAiMatch(app, internship)}
                        disabled={analyzingAppId === app.id}
                      >
                        {analyzingAppId === app.id ? 'Analyzing...' : <><Sparkles className="w-4 h-4 mr-1.5" /> Get AI Match</>}
                      </Button>
                    </div>

                    {app.status === 'rejected' && ((app.aiCons?.length ?? 0) > 0 || Boolean(app.aiFeedback)) && (
                      <div className="px-4 pb-2 pt-0">
                        <p className="text-xs font-semibold text-rose-700 mb-2 uppercase tracking-wide">
                          Negatives (Rejection Reasons)
                        </p>
                        {app.aiCons?.length ? (
                          <ul className="space-y-1 list-disc list-inside">
                            {app.aiCons.slice(0, 5).map((con, idx) => (
                              <li key={idx} className="text-xs text-rose-700">
                                <p className="inline">{cleanAiText(con)}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-rose-700 leading-relaxed">
                            {app.aiFeedback ? cleanAiText(app.aiFeedback).slice(0, 180) : ''}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="px-4 pb-4 flex items-center justify-end gap-2">
                      {app.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => cancelApplication(app.id)}>
                          Cancel
                        </Button>
                      )}
                      {canRemove && (
                        <Button size="sm" variant="danger" onClick={() => removeApplication(app.id)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Available Internships */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Discover Internships</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {internships.filter(i => !i.isClosed || i.isCompleted).map(internship => {
            const myApplication = applications.find(a => a.internshipId === internship.id);
            const hasApplied = Boolean(myApplication);
            const internshipSkills = internship.requiredSkills || [];
            const deadlinePassed = Boolean(internship.deadlineAt) && new Date(String(internship.deadlineAt)).getTime() < Date.now();
            const deadlineText = internship.deadlineAt
              ? new Date(String(internship.deadlineAt)).toLocaleString()
              : '';
            const completed = Boolean(internship.isCompleted);
            const normalizeDept = (v: any) => String(v || '').trim().toLowerCase();
            const internshipDept = normalizeDept(internship.department);
            const studentDept = normalizeDept(user.department);
            const deptRestricted = internshipDept && internshipDept !== 'n/a';
            const deptMismatch = deptRestricted && internshipDept !== studentDept;
            return (
              <Card key={internship.id} className="flex flex-col group hover:border-indigo-200 transition-colors">
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{internship.title}</h3>
                    {myApplication && (
                      <Badge variant={
                        myApplication.status === 'approved' ? 'success' :
                        myApplication.status === 'rejected' ? 'danger' :
                        myApplication.status === 'pending' ? 'warning' : 'default'
                      }>
                        {myApplication.status}
                      </Badge>
                    )}
                  </div>

                  {deadlineText && (
                    <div className="mb-4">
                      <Badge variant={deadlinePassed ? 'danger' : 'warning'} className="whitespace-normal">
                        Deadline: {deadlineText}
                      </Badge>
                    </div>
                  )}

                  {completed && (
                    <div className="mb-4">
                      <Badge variant="ai" className="whitespace-normal">
                        Completed
                      </Badge>
                    </div>
                  )}
                  <p className="text-sm text-slate-600 mb-6 flex-1 line-clamp-3">{internship.description}</p>

                  <div className="space-y-1.5 mb-4 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-700">Company:</span> {internship.company || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-700">Location:</span> {internship.location || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-700">Duration:</span> {internship.duration || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-700">Department:</span> {internship.department || 'N/A'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {internshipSkills.slice(0, 3).map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {skill}
                      </span>
                    ))}
                    {internshipSkills.length > 3 && (
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-400">
                        +{internshipSkills.length - 3}
                      </span>
                    )}
                  </div>
                  {internship.brochureSnapshot && (
                    <a
                      href={`/${internship.brochureSnapshot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center text-sm font-medium py-2.5 mb-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      View Brochure (PDF)
                    </a>
                  )}
                  <div>
                    {completed ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Completed
                      </Button>
                    ) : hasApplied ? (
                      <Button variant="secondary" className="w-full" disabled>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {myApplication?.status === 'pending' ? 'Pending' : myApplication?.status === 'rejected' ? 'Rejected' : 'Applied'}
                      </Button>
                    ) : deadlinePassed ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Deadline passed
                      </Button>
                    ) : deptMismatch ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                        title={`Only ${internship.department} department students can apply`}
                      >
                        Department restricted
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => setSelectedInternship(internship)}>
                        Apply Now
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Resume Analyzer Section */}
      <section>
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl mr-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI Resume Analyzer</h2>
              <p className="text-sm text-slate-600">Upload your PDF resume to get instant feedback and suggestions for improvement.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <Button variant="outline" className="pointer-events-none bg-white">
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload PDF Resume'}
                </Button>
              </div>
              {resumeText && <span className="text-sm text-green-600 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Resume Uploaded</span>}
              {uploadedQuickAnalysis?.improvements?.length ? (
                <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl w-full">
                  <p className="text-xs font-semibold text-slate-900 mb-2">Suggested improvements</p>
                  <ul className="space-y-1.5 list-disc list-inside">
                    {uploadedQuickAnalysis.improvements.map((imp, idx) => (
                      <li key={idx} className="text-sm text-slate-700">{imp}</li>
                    ))}
                  </ul>
                </div>
              ) : isQuickAnalyzing ? (
                <p className="mt-3 text-xs text-slate-500">Generating improvement points...</p>
              ) : null}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={analyzeResume}
                disabled={isAnalyzing || !resumeText}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isAnalyzing ? 'Analyzing...' : <><Sparkles className="w-4 h-4 mr-2" /> Analyze & Improve</>}
              </Button>
            </div>

            <AnimatePresence>
  {aiFeedback && aiAnalysisData && (
    <motion.div>
      <div className="mt-4">
        <ResumeAnalysisDashboard  
          analysis={aiAnalysisData}
          isLoading={isAnalyzing}
        />
      </div>
    </motion.div>
  )}
</AnimatePresence>
          </div>
        </Card>
      </section>
    </div>
  );
}

// Faculty Dashboard
function FacultyDashboard({ user, onNotificationsChange }: { user: User, onNotificationsChange?: (notifications: { id: string; text: string; variant: 'success' | 'danger' | 'warning' }[]) => void }) {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newDepartment, setNewDepartment] = useState(user.department || '');
  const [newBrochureFile, setNewBrochureFile] = useState<File | null>(null);
  const [newDeadlineAt, setNewDeadlineAt] = useState<string>('');
  const [analyzingAppId, setAnalyzingAppId] = useState<string | null>(null);
  const [topCandidatesModal, setTopCandidatesModal] = useState<{ isOpen: boolean; internshipId: string; n: number; results: Application[] | null; loading: boolean }>({
    isOpen: false,
    internshipId: '',
    n: 3,
    results: null,
    loading: false
  });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = () => {
    fetch('/api/internships')
      .then(r => r.json())
      .then(data => {
        const normalizedInternships = Array.isArray(data) ? data.map(normalizeInternship) : [];
        const currentFacultyId = String((user as any).id || (user as any)._id || '');
        setInternships(normalizedInternships.filter((i: Internship) => String(i.facultyId) === currentFacultyId));
      });
    fetch('/api/applications')
      .then(r => r.json())
      .then(data => setApplications(Array.isArray(data) ? data.map(normalizeApplication) : []));
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data.map(normalizeUser) : []));
  };

  const createInternship = async () => {
    if (!newTitle || !newDesc) return;
    if (!newDeadlineAt) {
      alert('Please select an internship deadline time.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const requiredSkills = newSkills.split(',').map(s => s.trim()).filter(Boolean);
      const formData = new FormData();
      formData.append('title', newTitle);
      formData.append('description', newDesc);
      formData.append('company', newCompany.trim() || 'N/A');
      formData.append('location', newLocation.trim() || 'N/A');
      formData.append('duration', newDuration.trim() || 'N/A');
      formData.append('department', newDepartment.trim() || 'N/A');
      formData.append('facultyId', user.id);
      formData.append('requiredSkills', requiredSkills.join(','));
      formData.append('deadlineAt', newDeadlineAt);
      if (newBrochureFile) {
        formData.append('brochure', newBrochureFile);
      }

      await fetch('/api/internships', {
        method: 'POST',
        headers,
        body: formData
      });
      setIsCreating(false);
      setNewTitle('');
      setNewDesc('');
      setNewSkills('');
      setNewCompany('');
      setNewLocation('');
      setNewDuration('');
      setNewDepartment(user.department || '');
      setNewBrochureFile(null);
      setNewDeadlineAt('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const closeInternship = async (internshipId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/internships/${internshipId}/close`, {
        method: 'PUT',
        headers
      });

      if (!res.ok) {
        const data = await readJsonSafely(res);
        throw new Error(data.message || 'Failed to close internship');
      }

      fetchData();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to close internship');
    }
  };

  const completeInternship = async (internshipId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/internships/${internshipId}/complete`, {
        method: 'PUT',
        headers
      });

      if (!res.ok) {
        const data = await readJsonSafely(res);
        throw new Error(data.message || 'Failed to mark internship completed');
      }

      fetchData();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to mark internship completed');
    }
  };

  const removeInternship = async (internshipId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/internships/${internshipId}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        const data = await readJsonSafely(res);
        throw new Error(data.message || 'Failed to remove internship');
      }

      fetchData();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to remove internship');
    }
  };

  const updateStatus = async (appId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/applications/${appId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTopCandidates = async () => {
    if (!topCandidatesModal.internshipId) return;

    setTopCandidatesModal(prev => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/applications/internship/${topCandidatesModal.internshipId}/top-candidates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ n: topCandidatesModal.n })
      });

      const data = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch top candidates');
      }

      setTopCandidatesModal(prev => ({
        ...prev,
        loading: false,
        results: Array.isArray(data.candidates) ? data.candidates.map(normalizeApplication) : []
      }));
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to fetch top candidates');
      setTopCandidatesModal(prev => ({ ...prev, loading: false }));
    }
  };

  const getAiMatch = async (app: Application) => {
    setAnalyzingAppId(app.id);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Use application-scoped analysis endpoint so results are persisted in DB.
      const res = await fetch(`/api/applications/${app.id}/analyze`, {
        method: 'POST',
        headers
      });

      const data = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to analyze AI match');
      }

      const analysis = data.analysis || {};
      const persistedApp = data.application ? normalizeApplication(data.application) : null;

      setApplications(apps => apps.map(a => a.id === app.id ? {
        ...a,
        ...(persistedApp || {}),
        aiScore: typeof analysis.score === 'number' ? analysis.score : (persistedApp?.aiScore ?? a.aiScore),
        aiFeedback: analysis.summary || persistedApp?.aiFeedback || a.aiFeedback || '',
        aiPros: analysis.strengths || persistedApp?.aiPros || a.aiPros || [],
        aiCons: analysis.improvements || persistedApp?.aiCons || a.aiCons || []
      } : a));
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to analyze AI match. Please try again.');
    } finally {
      setAnalyzingAppId(null);
    }
  };

  const myInternshipIds = internships.map(i => String(i.id));
  const myApplications = applications.filter(a => myInternshipIds.includes(String(a.internshipId)));
  const selectedInternshipApplicantCount = topCandidatesModal.internshipId
    ? myApplications.filter(a => a.internshipId === topCandidatesModal.internshipId).length
    : 0;
  const maxSelectableTopCandidates = Math.max(1, selectedInternshipApplicantCount);
  const removedInternshipApplications = applications.filter(a => {
    const belongsToMe = String(a.facultyIdSnapshot || '') === String(user.id);
    const missingInternship = Boolean(a.internshipMissing || (a.internshipId && !internships.some(i => i.id === a.internshipId)));
    return belongsToMe && missingInternship;
  });

  const facultyNotifications = [
    ...myApplications
      .filter(a => !a.notificationArchivedAt && a.status === 'pending')
      .map(a => {
        const internshipTitle = internships.find(i => i.id === a.internshipId)?.title || a.internshipTitle || 'Internship';
        const studentName = users.find(u => u.id === a.studentId)?.name || 'A student';
        return {
          id: `${a.id}-pending`,
          text: `${studentName} applied for ${internshipTitle}.`,
          variant: 'warning' as const
        };
      }),
    ...myApplications
      .filter(a => !a.notificationArchivedAt && a.status === 'cancelled')
      .map(a => {
        const internshipTitle = internships.find(i => i.id === a.internshipId)?.title || a.internshipTitle || 'Internship';
        const studentName = users.find(u => u.id === a.studentId)?.name || 'A student';
        return {
          id: `${a.id}-cancelled`,
          text: `${studentName} cancelled their application for ${internshipTitle}.`,
          variant: 'warning' as const
        };
      })
  ];

  useEffect(() => {
    onNotificationsChange?.(facultyNotifications);
  }, [facultyNotifications, onNotificationsChange]);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Faculty Portal</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? 'Cancel' : <><PlusCircle className="w-4 h-4 mr-2" /> Post Internship</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="p-6 mb-8 bg-indigo-50/50 border-indigo-100">
              <h2 className="text-lg font-semibold text-indigo-900 mb-4">Create New Internship</h2>
              <div className="space-y-4">
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Title (e.g. Python Developer)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Company" value={newCompany} onChange={e => setNewCompany(e.target.value)} />
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Duration" value={newDuration} onChange={e => setNewDuration(e.target.value)} />
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Department" value={newDepartment} onChange={e => setNewDepartment(e.target.value)} />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Application Deadline (required)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newDeadlineAt}
                    onChange={e => setNewDeadlineAt(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <textarea className="w-full p-3 bg-white border border-slate-200 rounded-xl h-24 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                <input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Required Skills (comma separated, e.g. React, TypeScript, Node.js)" value={newSkills} onChange={e => setNewSkills(e.target.value)} />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Brochure PDF (optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={e => setNewBrochureFile(e.target.files?.[0] || null)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {newBrochureFile && (
                    <p className="text-xs text-slate-500">
                      Selected: {newBrochureFile.name}
                    </p>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={createInternship}>Publish Internship</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {topCandidatesModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-violet-50/50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-violet-600" />
                  AI Best Match Selection
                </h3>
                  <button
                    onClick={() => setTopCandidatesModal(prev => ({ ...prev, isOpen: false, results: null }))}
                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {!topCandidatesModal.results ? (
                <div className="p-8 flex flex-col items-center justify-center space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-slate-600 text-lg">
                      Let AI analyze all applications and identify the strongest candidates.
                    </p>
                    <p className="text-sm text-slate-400 italic">
                      This will process every resume against the job description.
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 w-full max-w-sm">
                    <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                      How many top candidates to select?
                    </label>
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => setTopCandidatesModal(prev => ({ ...prev, n: Math.max(1, prev.n - 1) }))}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold text-indigo-700 w-12 text-center">{topCandidatesModal.n}</span>
                      <button 
                        onClick={() => setTopCandidatesModal(prev => ({ ...prev, n: Math.min(maxSelectableTopCandidates, prev.n + 1) }))}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    disabled={topCandidatesModal.loading}
                    onClick={fetchTopCandidates}
                    className="w-full max-w-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-200"
                  >
                    {topCandidatesModal.loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing Candidates...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Find Top Matches
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h4 className="font-semibold text-slate-900">
                        Top {topCandidatesModal.results.length} Candidates Found
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => setTopCandidatesModal(prev => ({ ...prev, results: null }))}>
                        Start Over
                      </Button>
                    </div>

                    {topCandidatesModal.results.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                        <p className="text-slate-500">No matching candidates found.</p>
                      </div>
                    ) : (
                      topCandidatesModal.results.map((app, index) => {
                        // Find user data from `users` list if `app.studentId` is an ID
                        // Or use partial data if `app.studentId` is object (which normalizeApplication handles by extracting ID)
                        // Wait, `app` has simplified data. `users` has full list.
                        // However, `recommendTopCandidates` populated `student`.
                        // `normalizeApplication` converts `student` object to `studentId`.
                        // So we need to look up in `users`.
                        // BUT `users` might not be fully populated if `fetchData` only got a list.
                        // Actually `fetchData` calls `/api/users`.
                        // Let's rely on `users.find`.
                        const student = users.find(u => u.id === app.studentId);
                        
                        return (
                          <motion.div 
                            key={app.id} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-5 rounded-xl border border-violet-100 shadow-sm flex gap-4 relative overflow-hidden group hover:shadow-md transition-all"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500" />
                            
                            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-lg border border-violet-200">
                                #{index + 1}
                              </div>
                              <div className="text-xs font-bold text-slate-400">RANK</div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h5 className="font-bold text-slate-900 text-lg truncate">{student?.name || 'Unknown Candidate'}</h5>
                                  <p className="text-sm text-slate-500 truncate">{student?.email}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                                    {app.aiScore}%
                                  </span>
                                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Match</p>
                                </div>
                              </div>
                              
                              <div className="mt-4 p-4 bg-violet-50/50 rounded-lg border border-violet-100 text-base text-slate-700 leading-relaxed">
                                {cleanAiText(app.aiFeedback) || 'No feedback available.'}
                              </div>
                              
                              {(app.aiPros?.length ?? 0) > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-bold text-emerald-700 mb-2 uppercase tracking-wide">Strengths</p>
                                  <ol className="space-y-2 list-decimal list-inside">
                                    {app.aiPros.map((pro, i) => (
                                      <li key={i} className="text-emerald-900 text-sm">
                                        <p className="inline text-base text-emerald-900">{cleanAiText(pro)}</p>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {(app.aiCons?.length ?? 0) > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-bold text-rose-700 mb-2 uppercase tracking-wide">Gaps & Recommendations</p>
                                  <ul className="space-y-2 list-disc list-inside">
                                    {app.aiCons.map((con, i) => (
                                      <li key={i} className="text-rose-900 text-sm">
                                        <p className="inline text-base text-rose-900">{cleanAiText(con)}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Internships with Nested Applications */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Postings</h2>
          {internships.length === 0 ? (
            <p className="text-sm text-slate-500">No internships posted yet.</p>
          ) : (
            internships.map(internship => {
              const internshipApps = myApplications.filter(a => a.internshipId === internship.id);
              return (
                <Card key={internship.id} className="overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{internship.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">Posted {new Date(internship.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={internship.isCompleted ? 'ai' : (internship.isClosed ? 'default' : 'success')}>
                        {internship.isCompleted ? 'Completed' : (internship.isClosed ? 'Closed' : 'Open')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-slate-600 font-medium">{internshipApps.length} Applicant{internshipApps.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-violet-200 text-violet-700 hover:bg-violet-50"
                        onClick={() => setTopCandidatesModal({
                          isOpen: true,
                          internshipId: String(internship.id),
                          n: internshipApps.length,
                          results: null,
                          loading: false
                        })}
                      >
                       <Sparkles className="w-4 h-4 mr-1.5" /> Best Applicants
                      </Button>
                      {!internship.isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('Mark this internship as completed?')) {
                              completeInternship(internship.id);
                            }
                          }}
                          className="border-violet-200 text-violet-700 hover:bg-violet-50"
                        >
                          Mark Completed
                        </Button>
                      )}
                      {!internship.isClosed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('Close this internship? It will no longer appear to students.')) {
                              closeInternship(internship.id);
                            }
                          }}
                        >
                          Close
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (window.confirm('Remove this internship permanently?')) {
                            removeInternship(internship.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>

                  {/* Applications for this Internship */}
                  {internshipApps.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {internshipApps.map(app => {
                        const student = users.find(u => u.id === app.studentId);
                        return (
                          <div key={app.id} className="p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-base font-bold text-slate-900">{student?.name}</h4>
                                  <Badge variant={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                                    {app.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-500">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => getAiMatch(app)} disabled={analyzingAppId === app.id} className="border-violet-200 text-violet-700 hover:bg-violet-50">
                                  {analyzingAppId === app.id ? 'Analyzing...' : <><Sparkles className="w-4 h-4 mr-1.5"/> AI Match</>}
                                </Button>
                                {app.status === 'pending' && (
                                  <>
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(app.id, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => updateStatus(app.id, 'rejected')}>Reject</Button>
                                  </>
                                )}
                              </div>
                            </div>

                            <AnimatePresence>
                              {app.aiScore !== null && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-5 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-14 h-14 rounded-full bg-white border-2 border-violet-300 flex items-center justify-center shadow-sm">
                                        <span className="text-xl font-bold text-violet-700">{app.aiScore}%</span>
                                      </div>
                                      <div>
                                        <h5 className="text-sm font-bold text-violet-900 flex items-center">
                                          <Sparkles className="w-4 h-4 mr-1.5" /> Match Analysis
                                        </h5>
                                        <p className="text-xs text-violet-600 uppercase tracking-wide font-semibold">AI Evaluation</p>
                                      </div>
                                    </div>
                                  </div>

                                  {app.aiFeedback && (
                                    <div className="text-base text-slate-700 leading-relaxed bg-white/60 rounded-lg p-3 border border-violet-200/50">
                                      {cleanAiText(app.aiFeedback)}
                                    </div>
                                  )}

                                  {app.aiPros && app.aiPros.length > 0 && (
                                    <div>
                                      <p className="text-base font-bold text-emerald-700 mb-3">Strengths</p>
                                      <ol className="space-y-2 list-decimal list-inside">
                                        {app.aiPros.map((pro, i) => (
                                          <li key={i} className="text-emerald-900 text-sm">
                                            <p className="inline text-base text-emerald-900">{cleanAiText(pro)}</p>
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}

                                  {app.aiCons && app.aiCons.length > 0 && (
                                    <div>
                                      <p className="text-base font-bold text-rose-700 mb-3">Gaps & Recommendations</p>
                                      <ul className="space-y-2 list-disc list-inside">
                                        {app.aiCons.map((con, i) => (
                                          <li key={i} className="text-rose-900 text-sm">
                                            <p className="inline text-base text-rose-900">{cleanAiText(con)}</p>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <details className="group mt-3 pt-3 border-t border-slate-100">
                              <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700 list-none flex items-center">
                                <FileText className="w-4 h-4 mr-2" /> View Resume
                              </summary>
                              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 whitespace-pre-wrap max-h-100 overflow-y-auto">
                                {app.resumeText}
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-5 text-center">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No applicants yet</p>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('student');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserSecurityQuestion, setNewUserSecurityQuestion] = useState('');
  const [newUserSecurityAnswer, setNewUserSecurityAnswer] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  const fetchData = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data.map(normalizeUser) : []));
    fetch('/api/internships')
      .then(r => r.json())
      .then(data => setInternships(Array.isArray(data) ? data.map(normalizeInternship) : []));
    fetch('/api/applications')
      .then(r => r.json())
      .then(data => setApplications(Array.isArray(data) ? data.map(normalizeApplication) : []));
    fetchCacheStats();
  };

  const fetchCacheStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch('/api/admin/cache-stats', { headers });
      const data = await readJsonSafely(res);
      if (res.ok) {
        setCacheStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear all AI analysis cache and application data? This will remove all cached analysis results.')) {
      return;
    }

    setIsClearingCache(true);
    setCacheMessage('');
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers
      });
      const data = await readJsonSafely(res);

      if (res.ok) {
        setCacheMessage(`✓ Cache cleared successfully (${data.cacheEntriesDeleted} cache entries removed, ${data.applicationsReset} applications reset)`);
        fetchCacheStats();
      } else {
        setCacheMessage(`✗ Failed to clear cache: ${data.message}`);
      }
    } catch (err) {
      console.error('Error clearing cache:', err);
      setCacheMessage(`✗ Error: ${(err as Error).message}`);
    } finally {
      setIsClearingCache(false);
      setTimeout(() => setCacheMessage(''), 5000);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    setAddUserError('');
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/admin/create-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          department: newUserRole === 'student' ? newUserDepartment : undefined,
          // Needed for the forgot-password flow
          securityQuestion: newUserSecurityQuestion,
          securityAnswer: newUserSecurityAnswer
        })
      });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to add user');

      setShowAddUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('student');
      setNewUserDepartment('');
      setNewUserSecurityQuestion('');
      setNewUserSecurityAnswer('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setAddUserError(err.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
        <Button onClick={() => setShowAddUser(!showAddUser)}>
          {showAddUser ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add User</>}
        </Button>
      </div>

      {showAddUser && (
        <Card className="p-6 bg-slate-50 border-indigo-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Add New User</h3>
          {addUserError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center">
              <XCircle className="w-4 h-4 mr-2" />
              {addUserError}
            </div>
          )}
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" required value={newUserName} onChange={e => setNewUserName(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  autoComplete="off"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)} className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
              {newUserRole === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input type="text" required value={newUserDepartment} onChange={e => setNewUserDepartment(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Computer Science" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Security Question</label>
                <input
                  type="text"
                  required
                  value={newUserSecurityQuestion}
                  onChange={e => setNewUserSecurityQuestion(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g. What is your favorite teacher?"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Security Answer</label>
                <input
                  type="text"
                  required
                  value={newUserSecurityAnswer}
                  onChange={e => setNewUserSecurityAnswer(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your answer"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isAddingUser}>
                {isAddingUser ? 'Adding...' : 'Create User'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center">
          <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
            <Users className="h-8 w-8" />
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-slate-500">Total Users</p>
            <p className="text-3xl font-bold text-slate-900">{users.length}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center">
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
            <Briefcase className="h-8 w-8" />
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-slate-500">Active Internships</p>
            <p className="text-3xl font-bold text-slate-900">{internships.length}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center">
          <div className="p-4 rounded-2xl bg-violet-50 text-violet-600">
            <FileText className="h-8 w-8" />
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-slate-500">Total Applications</p>
            <p className="text-3xl font-bold text-slate-900">{applications.length}</p>
          </div>
        </Card>
      </div>

      <Card className="border-amber-100 bg-amber-50/50">
        <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BrainCircuit className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Cache Management</h3>
              <p className="text-xs text-slate-600">Manage cached AI analysis results</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {cacheStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-white rounded-lg border border-amber-100">
                <p className="text-sm text-slate-600 font-medium">Total Cached Entries</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{cacheStats.totalCount}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-amber-100">
                <p className="text-sm text-slate-600 font-medium">Cache Types</p>
                <div className="mt-2 space-y-1">
                  {Object.entries(cacheStats.byType).map(([type, count]) => (
                    <p key={type} className="text-xs text-slate-700">
                      <span className="font-medium">{type}:</span> {count as number}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
          {cacheMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              cacheMessage.includes('✓')
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {cacheMessage}
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="border-amber-200 text-amber-700 hover:bg-amber-100 w-full"
          >
            {isClearingCache ? 'Clearing cache...' : 'Clear All Cache'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">User Directory</h3>
        </div>
        <ul className="divide-y divide-slate-100">
          {users.map(user => (
            <li key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  <UserIcon className="h-5 w-5 text-slate-500" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-bold text-slate-900">{user.name}</div>
                  <div className="text-sm text-slate-500">
                    {user.email}
                    {user.department && <span className="ml-2 text-indigo-600 font-medium">• {user.department}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={
                  user.role === 'admin' ? 'danger' :
                  user.role === 'faculty' ? 'warning' : 'default'
                }>
                  {user.role.toUpperCase()}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 px-2">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentNotifications, setStudentNotifications] = useState<{ id: string; text: string; variant: 'success' | 'danger' | 'warning' }[]>([]);
  const [facultyNotifications, setFacultyNotifications] = useState<{ id: string; text: string; variant: 'success' | 'danger' | 'warning' }[]>([]);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Initialize user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const normalizedUser = {
          ...parsedUser,
          id: parsedUser.id || parsedUser._id
        };
        delete (normalizedUser as any)._id;
        setCurrentUser(normalizedUser);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (user: User & { token?: string }) => {
    const userWithoutToken = { ...user } as any;
    delete (userWithoutToken as any).token;
    userWithoutToken.id = userWithoutToken.id || userWithoutToken._id;
    delete userWithoutToken._id;

    setCurrentUser(userWithoutToken);
    if (user.token) {
      localStorage.setItem('token', user.token);
      localStorage.setItem('user', JSON.stringify(userWithoutToken));
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    const normalizedUser = {
      ...updatedUser,
      id: (updatedUser as any).id || (updatedUser as any)._id
    } as any;
    delete normalizedUser._id;

    setCurrentUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

      const currentNotifications = currentUser?.role === 'student' ? studentNotifications : currentUser?.role === 'faculty' ? facultyNotifications : [];
  const handleClearNotifications = async () => {
    if (currentUser?.role === 'student') {
      // Extract application IDs from notifications
      const applicationIds = studentNotifications
        .filter(n => n.id.includes('-approved') || n.id.includes('-rejected') || n.id.includes('-removed'))
        .map(n => n.id.split('-')[0]) // Extract app ID
        .filter((id, idx, arr) => arr.indexOf(id) === idx); // Deduplicate

      // Extract internship IDs from closed notifications
      const internshipIds = studentNotifications
        .filter(n => n.id.includes('-closed'))
        .map(n => n.id.split('-')[0]) // Extract internship ID
        .filter((id, idx, arr) => arr.indexOf(id) === idx); // Deduplicate

      if (applicationIds.length > 0 || internshipIds.length > 0) {
        try {
          const token = localStorage.getItem('token');
          const headers: any = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          await fetch('/api/applications/archive-notifications/bulk', {
            method: 'POST',
            headers,
            body: JSON.stringify({ applicationIds, internshipIds })
          });
        } catch (e) {
          console.error('Failed to archive notifications:', e);
        }
      }
      setStudentNotifications([]);
    } else if (currentUser?.role === 'faculty') {
      // Extract application IDs from student action notifications (pending, cancelled)
      const applicationIds = facultyNotifications
        .map(n => n.id.split('-')[0])
        .filter((id, idx, arr) => arr.indexOf(id) === idx);

      if (applicationIds.length > 0) {
        try {
          const token = localStorage.getItem('token');
          const headers: any = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          await fetch('/api/applications/archive-notifications/bulk', {
            method: 'POST',
            headers,
            body: JSON.stringify({ applicationIds, internshipIds: [] })
          });
        } catch (e) {
          console.error('Failed to archive notifications:', e);
        }
      }
      setFacultyNotifications([]);
    }
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => setIsChangePasswordOpen(false)}
      />
      <Layout 
        user={currentUser} 
        onLogout={handleLogout} 
        notifications={currentNotifications} 
        onClearNotifications={handleClearNotifications}
        isChangePasswordOpen={isChangePasswordOpen}
        onChangePasswordToggle={() => setIsChangePasswordOpen(!isChangePasswordOpen)}
        onPasswordChanged={() => setIsChangePasswordOpen(false)}
      >
        <Routes>
          <Route path="/" element={
            currentUser.role === 'student' ? <StudentDashboard user={currentUser} onUpdateUser={handleUserUpdate} onNotificationsChange={setStudentNotifications} /> :
            currentUser.role === 'faculty' ? <FacultyDashboard user={currentUser} onNotificationsChange={setFacultyNotifications} /> :
            <AdminDashboard />
          } />
          <Route
            path="/profile/:id?"
            element={<ProfilePage currentUser={currentUser} onRequestChangePassword={() => setIsChangePasswordOpen(true)} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
