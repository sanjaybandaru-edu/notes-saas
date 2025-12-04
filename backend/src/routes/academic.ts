import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { notFound } from '../middleware/errorHandler.js';

const router = Router();

// ============= PUBLIC ROUTES (for onboarding) =============

// Get all academic years
router.get('/academic-years', async (req, res: Response, next: NextFunction) => {
    try {
        const academicYears = await prisma.academicYear.findMany({
            orderBy: { startDate: 'desc' },
            select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                isActive: true,
            },
        });
        res.json({ academicYears });
    } catch (error) {
        next(error);
    }
});

// Get universities for an academic year
router.get('/universities', async (req, res: Response, next: NextFunction) => {
    try {
        const { academicYearId } = req.query;

        const where: any = { isVisible: true };
        if (academicYearId) {
            where.academicYearId = academicYearId as string;
        }

        const universities = await prisma.university.findMany({
            where,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true,
                logo: true,
                website: true,
            },
        });
        res.json({ universities });
    } catch (error) {
        next(error);
    }
});

// Get campuses for a university
router.get('/universities/:universityId/campuses', async (req, res: Response, next: NextFunction) => {
    try {
        const { universityId } = req.params;

        const campuses = await prisma.campus.findMany({
            where: {
                universityId,
                isVisible: true,
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true,
                location: true,
            },
        });
        res.json({ campuses });
    } catch (error) {
        next(error);
    }
});

// Get departments for a campus
router.get('/campuses/:campusId/departments', async (req, res: Response, next: NextFunction) => {
    try {
        const { campusId } = req.params;

        const departments = await prisma.department.findMany({
            where: {
                campusId,
                isVisible: true,
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true,
                description: true,
                icon: true,
            },
        });
        res.json({ departments });
    } catch (error) {
        next(error);
    }
});

// Get programs for a department
router.get('/departments/:departmentId/programs', async (req, res: Response, next: NextFunction) => {
    try {
        const { departmentId } = req.params;

        const programs = await prisma.program.findMany({
            where: {
                departmentId,
                isVisible: true,
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true,
                shortName: true,
                duration: true,
                totalSemesters: true,
                degreeType: true,
            },
        });
        res.json({ programs });
    } catch (error) {
        next(error);
    }
});

// Get semesters for a program
router.get('/programs/:programId/semesters', async (req, res: Response, next: NextFunction) => {
    try {
        const { programId } = req.params;

        const semesters = await prisma.semester.findMany({
            where: {
                programId,
                isVisible: true,
            },
            orderBy: { number: 'asc' },
            select: {
                id: true,
                number: true,
                type: true,
            },
        });
        res.json({ semesters });
    } catch (error) {
        next(error);
    }
});

// Get subjects for a semester
router.get('/semesters/:semesterId/subjects', async (req, res: Response, next: NextFunction) => {
    try {
        const { semesterId } = req.params;

        const subjects = await prisma.subject.findMany({
            where: {
                semesterId,
                isVisible: true,
            },
            orderBy: [
                { isCore: 'desc' },
                { name: 'asc' },
            ],
            include: {
                electiveGroup: true,
            },
        });

        // Group by core and electives
        const coreSubjects = subjects.filter(s => s.isCore);
        const electiveSubjects = subjects.filter(s => !s.isCore);

        // Group electives by their group
        const electiveGroups = electiveSubjects.reduce((acc, subject) => {
            const groupId = subject.electiveGroupId || 'ungrouped';
            if (!acc[groupId]) {
                acc[groupId] = {
                    group: subject.electiveGroup,
                    subjects: [],
                };
            }
            acc[groupId].subjects.push(subject);
            return acc;
        }, {} as Record<string, { group: any; subjects: typeof electiveSubjects }>);

        res.json({
            coreSubjects,
            electiveGroups: Object.values(electiveGroups),
        });
    } catch (error) {
        next(error);
    }
});

// ============= SUBJECT CONTENT (for reader) =============

// Get subject with chapters
router.get('/subjects/:subjectId', async (req, res: Response, next: NextFunction) => {
    try {
        const { subjectId } = req.params;

        const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
            include: {
                semester: {
                    include: {
                        program: {
                            include: {
                                department: {
                                    include: {
                                        campus: {
                                            include: {
                                                university: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                chapters: {
                    where: { isVisible: true },
                    orderBy: { order: 'asc' },
                    include: {
                        topics: {
                            where: { isVisible: true, status: 'PUBLISHED' },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                excerpt: true,
                                order: true,
                            },
                        },
                    },
                },
            },
        });

        if (!subject) {
            throw notFound('Subject not found');
        }

        res.json({ subject });
    } catch (error) {
        next(error);
    }
});

// Get topic content
router.get('/topics/:topicId', async (req, res: Response, next: NextFunction) => {
    try {
        const { topicId } = req.params;

        const topic = await prisma.topic.findUnique({
            where: { id: topicId },
            include: {
                chapter: {
                    include: {
                        subject: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!topic) {
            throw notFound('Topic not found');
        }

        if (topic.status !== 'PUBLISHED' && !topic.isVisible) {
            throw notFound('Topic not found');
        }

        res.json({ topic });
    } catch (error) {
        next(error);
    }
});

// ============= ADMIN ROUTES =============

// Create academic year (SUPER_ADMIN only)
router.post('/academic-years', authenticate, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, startDate, endDate, isActive } = req.body;

        const academicYear = await prisma.academicYear.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: isActive || false,
            },
        });

        res.status(201).json({ academicYear });
    } catch (error) {
        next(error);
    }
});

// Create university
router.post('/universities', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, logo, website, academicYearId } = req.body;

        const university = await prisma.university.create({
            data: {
                name,
                code,
                logo,
                website,
                academicYearId,
            },
        });

        res.status(201).json({ university });
    } catch (error) {
        next(error);
    }
});

// Create campus
router.post('/campuses', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, location, universityId } = req.body;

        const campus = await prisma.campus.create({
            data: {
                name,
                code,
                location,
                universityId,
            },
        });

        res.status(201).json({ campus });
    } catch (error) {
        next(error);
    }
});

// Create department
router.post('/departments', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, description, icon, campusId } = req.body;

        const department = await prisma.department.create({
            data: {
                name,
                code,
                description,
                icon,
                campusId,
            },
        });

        res.status(201).json({ department });
    } catch (error) {
        next(error);
    }
});

// Create program
router.post('/programs', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, shortName, duration, totalSemesters, degreeType, departmentId } = req.body;

        const program = await prisma.program.create({
            data: {
                name,
                code,
                shortName,
                duration,
                totalSemesters,
                degreeType,
                departmentId,
            },
        });

        // Auto-create semesters
        for (let i = 1; i <= totalSemesters; i++) {
            await prisma.semester.create({
                data: {
                    number: i,
                    type: i % 2 === 1 ? 'ODD' : 'EVEN',
                    programId: program.id,
                },
            });
        }

        res.status(201).json({ program });
    } catch (error) {
        next(error);
    }
});

// Create subject
router.post('/subjects', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, description, credits, subjectType, isCore, semesterId, electiveGroupId } = req.body;

        const subject = await prisma.subject.create({
            data: {
                name,
                code,
                description,
                credits,
                subjectType,
                isCore,
                semesterId,
                electiveGroupId,
            },
        });

        res.status(201).json({ subject });
    } catch (error) {
        next(error);
    }
});

// Create elective group
router.post('/elective-groups', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, description, minChoice, maxChoice } = req.body;

        const electiveGroup = await prisma.electiveGroup.create({
            data: {
                name,
                code,
                description,
                minChoice,
                maxChoice,
            },
        });

        res.status(201).json({ electiveGroup });
    } catch (error) {
        next(error);
    }
});

export default router;
