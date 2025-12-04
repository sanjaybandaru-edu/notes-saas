import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Creating admin user...');

    const adminPassword = await bcrypt.hash('Admin@123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@edudocs.in' },
        update: {
            passwordHash: adminPassword,
            name: 'Admin User',
            role: UserRole.SUPER_ADMIN,
            isOnboarded: true,
            isActive: true,
        },
        create: {
            email: 'admin@edudocs.in',
            passwordHash: adminPassword,
            name: 'Admin User',
            role: UserRole.SUPER_ADMIN,
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
            role: UserRole.STUDENT,
        },
        create: {
            email: 'student@edudocs.in',
            passwordHash: studentPassword,
            name: 'Demo Student',
            role: UserRole.STUDENT,
        },
    });

    console.log('✅ Student user created:', student.email);

    console.log('\n🎉 Admin seed completed!');
    console.log('Credentials:');
    console.log('  Admin: admin@edudocs.in / Admin@123');
    console.log('  Student: student@edudocs.in / Student@123');
}

main()
    .catch((e) => {
        console.error('❌ Admin seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
