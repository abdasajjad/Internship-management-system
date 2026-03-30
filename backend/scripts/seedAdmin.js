const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {});

        const existingAdminCount = await User.countDocuments({ role: 'admin' });
        if (existingAdminCount > 0) {
            console.log('Admin user already exists. Skipping creation.');
            process.exit(0);
        }

        const adminName = process.env.ADMIN_SEED_NAME || 'admin_placeholder';
        const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!';

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const adminUser = new User({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();

        console.log('Admin user created successfully.');
        console.log(`Email: ${adminEmail}`);
        console.log('Password: Change this placeholder before production use.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to seed admin user:', error.message);
        process.exit(1);
    }
};

seedAdmin();
