/* ============================================================
   Seed Script — Love For You ❤️
   Creates the two predefined users if they don't exist
   ============================================================ */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('💕 Connected to MongoDB for seeding...');

        const existingCount = await User.countDocuments();
        if (existingCount >= 2) {
            console.log('✅ Users already exist. Skipping seed.');
            await mongoose.disconnect();
            process.exit(0);
        }

        // Clear existing users (fresh seed)
        await User.deleteMany({});

        const users = [
            {
                name: process.env.ADMIN_NAME || 'Salif',
                email: process.env.ADMIN_EMAIL || 'salif@loveforyou.com',
                password: process.env.ADMIN_PASSWORD || 'ILoveYou@2026',
                role: 'admin',
                avatar: '🥰',
            },
            {
                name: process.env.USER_NAME || 'My Love',
                email: process.env.USER_EMAIL || 'love@loveforyou.com',
                password: process.env.USER_PASSWORD || 'ILoveYouToo@2026',
                role: 'user',
                avatar: '💕',
            },
        ];

        for (const userData of users) {
            await User.create(userData);
            console.log(`   ✓ Created ${userData.role}: ${userData.name} (${userData.email})`);
        }

        console.log('\n🎉 Seed complete! Two users created.\n');
        console.log('━'.repeat(50));
        console.log(`  Admin: ${users[0].email} / ${process.env.ADMIN_PASSWORD || 'ILoveYou@2026'}`);
        console.log(`  User:  ${users[1].email} / ${process.env.USER_PASSWORD || 'ILoveYouToo@2026'}`);
        console.log('━'.repeat(50));

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

seedUsers();
