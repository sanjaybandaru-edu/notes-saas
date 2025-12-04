const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Creating admin user (JS)...');

    try {
        const adminPassword = await bcrypt.hash('Admin@123', 10);

        const admin = await prisma.user.upsert({
            where: { email: 'admin@edudocs.in' },
            update: {
                passwordHash: adminPassword,
                name: 'Admin User',
                role: 'SUPER_ADMIN', // Hardcoded enum value string
                isOnboarded: true,
                isActive: true,
            },
            create: {
                email: 'admin@edudocs.in',
                passwordHash: adminPassword,
                name: 'Admin User',
                role: 'SUPER_ADMIN',
                isOnboarded: true,
                isActive: true,
            },
        });

        console.log('✅ Admin user created:', admin.email);

        const studentPassword = await bcrypt.hash('Student@123', 10);

        const student = await prisma.user.upsert({
            where: { email: 'student@edudocs.in' },
            update: {
                passwordHash: studentPassword,
                name: 'Demo Student',
                role: 'STUDENT',
            },
            create: {
                email: 'student@edudocs.in',
                passwordHash: studentPassword,
                name: 'Demo Student',
                role: 'STUDENT',
            },
        });

        console.log('✅ Student user created:', student.email);

    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
