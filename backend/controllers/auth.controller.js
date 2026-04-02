const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PUBLIC_SIGNUP_ROLE = 'student';
const ADMIN_CREATABLE_ROLES = ['student', 'faculty'];

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isValidEmail = (email) => {
    const v = normalizeEmail(email);
    // Reasonable validation (not full RFC). Good enough for UI/account integrity.
    // - one @
    // - no spaces
    // - domain contains a dot
    // - TLD length >= 2
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
};

const buildAuthUser = (user) => ({
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    resume: user.resume,
    resumeText: user.resumeText || ''
});

exports.register = async (req, res) => {
    const { name, email, password, role, department, securityQuestion, securityAnswer } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        if (role && role !== PUBLIC_SIGNUP_ROLE) {
            return res.status(403).json({ message: 'Public signup is available for students only' });
        }

        const normalizedEmail = normalizeEmail(email);
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: PUBLIC_SIGNUP_ROLE,
            department,
            securityQuestion: securityQuestion || '',
            securityAnswer: securityAnswer || ''
        });
        await user.save();

        const payload = {
            id: user.id,
            role: user.role
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: buildAuthUser(user) });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createUserByAdmin = async (req, res) => {
    const { name, email, password, role, department, securityQuestion, securityAnswer } = req.body;

    try {
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password and role are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        if (!ADMIN_CREATABLE_ROLES.includes(role)) {
            return res.status(403).json({ message: 'Admin can only create student or faculty users' });
        }

        if (role === 'student' && !department) {
            return res.status(400).json({ message: 'Department is required for students' });
        }

        const normalizedEmail = normalizeEmail(email);
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role,
            department: role === 'student' ? department : undefined,
            securityQuestion: securityQuestion || '',
            securityAnswer: securityAnswer || ''
        });

        await user.save();

        return res.status(201).json({ message: 'User created successfully', user: buildAuthUser(user) });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const normalizedEmail = normalizeEmail(email);
        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = {
            id: user.id,
            role: user.role
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: buildAuthUser(user) });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Change password - Simple form without email
 * @route POST /api/auth/change-password
 * @access Private (Authenticated users only)
 */
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New passwords do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from old password' });
        }

        // Find user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Verify security answer for forgot password
 * @route POST /api/auth/verify-security-answer
 * @access Public
 */
exports.verifySecurityAnswer = async (req, res) => {
    try {
        const { email, securityAnswer } = req.body;

        if (!email || !securityAnswer) {
            return res.status(400).json({ message: 'Email and security answer are required' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.securityQuestion || !user.securityAnswer) {
            return res.status(400).json({ message: 'Security questions not set up for this account' });
        }

        // Simple case-insensitive comparison
        const isCorrect = user.securityAnswer.toLowerCase().trim() === securityAnswer.toLowerCase().trim();
        
        if (!isCorrect) {
            return res.status(400).json({ message: 'Incorrect security answer' });
        }

        res.json({ message: 'Security answer verified', email: user.email });
    } catch (err) {
        console.error('Verify security answer error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get security question for forgot password
 * @route POST /api/auth/get-security-question
 * @access Public
 */
exports.getSecurityQuestion = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.securityQuestion) {
            return res.status(400).json({ message: 'Security question not set up' });
        }

        res.json({ securityQuestion: user.securityQuestion });
    } catch (err) {
        console.error('Get security question error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Reset password using security answer
 * @route POST /api/auth/reset-password-security
 * @access Public
 */
exports.resetPasswordWithSecurity = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password reset successfully. You can now login with your new password.' });
    } catch (err) {
        console.error('Reset password with security error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
