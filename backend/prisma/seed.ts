import { PrismaClient, UserRole, DegreeType, SemesterType, SubjectType, ContentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting EduDocs seed...');

    // ============= ACADEMIC YEAR =============
    const academicYear = await prisma.academicYear.upsert({
        where: { id: 'ay-2024-25' },
        update: {},
        create: {
            id: 'ay-2024-25',
            name: '2024-25',
            startDate: new Date('2024-07-01'),
            endDate: new Date('2025-06-30'),
            isActive: true,
        },
    });
    console.log('✅ Academic Year created:', academicYear.name);

    // ============= UNIVERSITY =============
    const university = await prisma.university.upsert({
        where: { code: 'VTU' },
        update: {},
        create: {
            name: 'Visvesvaraya Technological University',
            code: 'VTU',
            logo: 'https://vtu.ac.in/logo.png',
            website: 'https://vtu.ac.in',
            academicYearId: academicYear.id,
        },
    });
    console.log('✅ University created:', university.name);

    // ============= CAMPUS =============
    const mainCampus = await prisma.campus.upsert({
        where: { universityId_code: { universityId: university.id, code: 'MAIN' } },
        update: {},
        create: {
            name: 'Main Campus',
            code: 'MAIN',
            location: 'Belgaum, Karnataka',
            universityId: university.id,
        },
    });
    console.log('✅ Campus created:', mainCampus.name);

    // ============= DEPARTMENTS =============
    const cseDept = await prisma.department.upsert({
        where: { campusId_code: { campusId: mainCampus.id, code: 'CSE' } },
        update: {},
        create: {
            name: 'Computer Science & Engineering',
            code: 'CSE',
            description: 'Department of Computer Science and Engineering',
            icon: '💻',
            campusId: mainCampus.id,
        },
    });

    const mbaDept = await prisma.department.upsert({
        where: { campusId_code: { campusId: mainCampus.id, code: 'MBA' } },
        update: {},
        create: {
            name: 'School of Business Administration',
            code: 'MBA',
            description: 'Master of Business Administration',
            icon: '📊',
            campusId: mainCampus.id,
        },
    });
    console.log('✅ Departments created: CSE, MBA');

    // ============= PROGRAMS =============
    const btechCSE = await prisma.program.upsert({
        where: { departmentId_code: { departmentId: cseDept.id, code: 'BTECH-CSE' } },
        update: {},
        create: {
            name: 'Bachelor of Technology in Computer Science',
            code: 'BTECH-CSE',
            shortName: 'B.Tech CSE',
            duration: 4,
            totalSemesters: 8,
            degreeType: DegreeType.UNDERGRADUATE,
            departmentId: cseDept.id,
        },
    });

    const mbaProg = await prisma.program.upsert({
        where: { departmentId_code: { departmentId: mbaDept.id, code: 'MBA' } },
        update: {},
        create: {
            name: 'Master of Business Administration',
            code: 'MBA',
            shortName: 'MBA',
            duration: 2,
            totalSemesters: 4,
            degreeType: DegreeType.POSTGRADUATE,
            departmentId: mbaDept.id,
        },
    });
    console.log('✅ Programs created: B.Tech CSE, MBA');

    // ============= SEMESTERS =============
    const semesters: { number: number; type: SemesterType }[] = [
        { number: 1, type: SemesterType.ODD },
        { number: 2, type: SemesterType.EVEN },
        { number: 3, type: SemesterType.ODD },
        { number: 4, type: SemesterType.EVEN },
        { number: 5, type: SemesterType.ODD },
        { number: 6, type: SemesterType.EVEN },
        { number: 7, type: SemesterType.ODD },
        { number: 8, type: SemesterType.EVEN },
    ];

    for (const sem of semesters) {
        await prisma.semester.upsert({
            where: { programId_number: { programId: btechCSE.id, number: sem.number } },
            update: {},
            create: {
                number: sem.number,
                type: sem.type,
                programId: btechCSE.id,
            },
        });
    }
    console.log('✅ Semesters created for B.Tech CSE (1-8)');

    // Get Semester 3 for subjects
    const semester3 = await prisma.semester.findUnique({
        where: { programId_number: { programId: btechCSE.id, number: 3 } },
    });

    if (semester3) {
        // ============= ELECTIVE GROUP =============
        const oeGroupA = await prisma.electiveGroup.upsert({
            where: { code: 'OE-A-S3' },
            update: {},
            create: {
                name: 'Open Elective Group A',
                code: 'OE-A-S3',
                description: 'Choose one from the available options',
                minChoice: 1,
                maxChoice: 1,
            },
        });

        // ============= SUBJECTS =============
        const dsSubject = await prisma.subject.upsert({
            where: { semesterId_code: { semesterId: semester3.id, code: '21CS32' } },
            update: {},
            create: {
                name: 'Data Structures',
                code: '21CS32',
                description: 'Fundamental data structures and algorithms',
                credits: 4,
                subjectType: SubjectType.THEORY,
                isCore: true,
                semesterId: semester3.id,
            },
        });

        await prisma.subject.upsert({
            where: { semesterId_code: { semesterId: semester3.id, code: '21CS33' } },
            update: {},
            create: {
                name: 'Database Management Systems',
                code: '21CS33',
                description: 'Relational databases, SQL, and database design',
                credits: 3,
                subjectType: SubjectType.THEORY,
                isCore: true,
                semesterId: semester3.id,
            },
        });

        await prisma.subject.upsert({
            where: { semesterId_code: { semesterId: semester3.id, code: '21CS34' } },
            update: {},
            create: {
                name: 'Operating Systems',
                code: '21CS34',
                description: 'Process management, memory, and file systems',
                credits: 3,
                subjectType: SubjectType.THEORY,
                isCore: true,
                semesterId: semester3.id,
            },
        });

        // Elective subjects
        await prisma.subject.upsert({
            where: { semesterId_code: { semesterId: semester3.id, code: '21OE-PY' } },
            update: {},
            create: {
                name: 'Python Programming',
                code: '21OE-PY',
                description: 'Introduction to Python programming',
                credits: 3,
                subjectType: SubjectType.THEORY,
                isCore: false,
                semesterId: semester3.id,
                electiveGroupId: oeGroupA.id,
            },
        });

        await prisma.subject.upsert({
            where: { semesterId_code: { semesterId: semester3.id, code: '21OE-WD' } },
            update: {},
            create: {
                name: 'Web Development',
                code: '21OE-WD',
                description: 'HTML, CSS, JavaScript, and modern frameworks',
                credits: 3,
                subjectType: SubjectType.THEORY,
                isCore: false,
                semesterId: semester3.id,
                electiveGroupId: oeGroupA.id,
            },
        });

        console.log('✅ Subjects created for Semester 3');

        // ============= CHAPTERS & TOPICS =============
        const chapter1 = await prisma.chapter.upsert({
            where: { subjectId_slug: { subjectId: dsSubject.id, slug: 'arrays' } },
            update: {},
            create: {
                title: 'Arrays',
                slug: 'arrays',
                description: 'Introduction to arrays and their operations',
                order: 1,
                status: ContentStatus.PUBLISHED,
                subjectId: dsSubject.id,
            },
        });

        // Create admin user first for topics
        const adminPassword = await bcrypt.hash('Admin@123', 10);
        const adminUser = await prisma.user.upsert({
            where: { email: 'admin@edudocs.in' },
            update: {},
            create: {
                email: 'admin@edudocs.in',
                passwordHash: adminPassword,
                name: 'Admin User',
                role: UserRole.SUPER_ADMIN,
                isOnboarded: true,
            },
        });

        await prisma.topic.upsert({
            where: { chapterId_slug: { chapterId: chapter1.id, slug: 'introduction-to-arrays' } },
            update: {},
            create: {
                title: 'Introduction to Arrays',
                slug: 'introduction-to-arrays',
                content: `# Introduction to Arrays

An **array** is a collection of elements stored at contiguous memory locations. It is one of the most fundamental data structures in computer science.

## Why Use Arrays?

- **Constant-time access**: Access any element using its index in O(1) time
- **Memory efficiency**: Elements stored contiguously in memory
- **Cache friendly**: Better cache locality due to contiguous storage

## Declaring Arrays

\`\`\`c
// C/C++
int arr[5] = {1, 2, 3, 4, 5};

// Java
int[] arr = new int[5];

// Python
arr = [1, 2, 3, 4, 5]
\`\`\`

## Time Complexity

| Operation | Average | Worst |
|-----------|---------|-------|
| Access | O(1) | O(1) |
| Search | O(n) | O(n) |
| Insert | O(n) | O(n) |
| Delete | O(n) | O(n) |

## Key Points to Remember

1. Arrays are zero-indexed (first element at index 0)
2. Size is typically fixed at creation time
3. All elements must be of the same type
`,
                excerpt: 'Learn about arrays, one of the most fundamental data structures',
                order: 1,
                status: ContentStatus.PUBLISHED,
                publishedAt: new Date(),
                chapterId: chapter1.id,
                createdById: adminUser.id,
            },
        });

        console.log('✅ Chapters and Topics created');
    }

    // ============= DEMO STUDENT =============
    const studentPassword = await bcrypt.hash('Student@123', 10);
    await prisma.user.upsert({
        where: { email: 'student@edudocs.in' },
        update: {},
        create: {
            email: 'student@edudocs.in',
            passwordHash: studentPassword,
            name: 'Demo Student',
            role: UserRole.STUDENT,
            campusId: mainCampus.id,
            isOnboarded: false,
        },
    });
    console.log('✅ Demo users created');

    // ============= ACHIEVEMENTS =============
    const achievements = [
        {
            name: 'First Steps',
            description: 'Complete your first topic',
            icon: '🎯',
            points: 10,
            category: 'READING' as const,
            condition: { type: 'topics_completed', count: 1 },
        },
        {
            name: 'Bookworm',
            description: 'Complete 10 topics',
            icon: '📚',
            points: 50,
            category: 'READING' as const,
            condition: { type: 'topics_completed', count: 10 },
        },
        {
            name: 'On Fire',
            description: 'Maintain a 7-day streak',
            icon: '🔥',
            points: 100,
            category: 'STREAK' as const,
            condition: { type: 'streak', days: 7 },
        },
        {
            name: 'Scholar',
            description: 'Complete all topics in a subject',
            icon: '🎓',
            points: 200,
            category: 'COMPLETION' as const,
            condition: { type: 'subject_completed', count: 1 },
        },
    ];

    for (const achievement of achievements) {
        await prisma.achievement.upsert({
            where: { id: achievement.name.toLowerCase().replace(/\s+/g, '-') },
            update: {},
            create: {
                id: achievement.name.toLowerCase().replace(/\s+/g, '-'),
                ...achievement,
            },
        });
    }
    console.log('✅ Achievements created');

    // ============= SUBSCRIPTION PLANS =============
    const plans = [
        {
            name: 'Free',
            code: 'FREE',
            description: 'Basic access for students',
            price: 0,
            features: ['Access to all public content', 'Basic analytics', '5 bookmarks', '10 flashcards'],
            limits: { apiCalls: 100, storage: '100MB' },
        },
        {
            name: 'Pro',
            code: 'PRO',
            description: 'Enhanced features for serious learners',
            price: 199,
            features: ['All Free features', 'Unlimited bookmarks', 'Unlimited flashcards', 'AI-generated quizzes', 'Priority support'],
            limits: { apiCalls: 1000, storage: '5GB' },
        },
        {
            name: 'Enterprise',
            code: 'ENTERPRISE',
            description: 'For institutions and universities',
            price: 4999,
            features: ['All Pro features', 'Custom branding', 'Admin dashboard', 'API access', 'Dedicated support'],
            limits: { apiCalls: 10000, storage: '100GB' },
        },
    ];

    for (let i = 0; i < plans.length; i++) {
        await prisma.subscriptionPlan.upsert({
            where: { code: plans[i].code },
            update: {},
            create: {
                ...plans[i],
                displayOrder: i,
            },
        });
    }
    console.log('✅ Subscription plans created');

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Demo Credentials:');
    console.log('  Admin: admin@edudocs.in / Admin@123');
    console.log('  Student: student@edudocs.in / Student@123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
