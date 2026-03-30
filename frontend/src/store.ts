export type Role = 'student' | 'faculty' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  password?: string;
  department?: string;
  resumeText?: string;
}

export interface Internship {
  id: string;
  title: string;
  company?: string;
  description: string;
  location?: string;
  duration?: string;
  department?: string;
  facultyId: string;
  requiredSkills: string[];
  // Stored as `uploads/<filename>.pdf` (served via express at `/uploads/...`)
  brochureSnapshot?: string | null;
  deadlineAt: string;
  isClosed: boolean;
  notificationArchivedAt?: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  studentId: string;
  internshipId: string;
  internshipTitle?: string;
  facultyIdSnapshot?: string;
  internshipMissing?: boolean;
  resumeText: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  aiScore: number | null;
  aiFeedback: string | null;
  aiPros?: string[];
  aiCons?: string[];
  notificationArchivedAt?: string | null;
  appliedAt: string;
  // Student-uploaded completion proof (uploaded file that faculty verifies)
  certificate?: string | null;
  certificateStatus?: 'not_uploaded' | 'pending_verification' | 'verified' | 'rejected' | null;

  // Internship completion certificate PDF generated for the student
  internshipCompletionCertificate?: string | null;

  completedAt?: string | null;
}
