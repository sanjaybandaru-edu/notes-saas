import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const onboardingSchema = z.object({
    campusId: z.string().uuid(),
    programId: z.string().uuid(),
    currentSemester: z.number().min(1).max(8),
    electiveSubjectIds: z.array(z.string().uuid()).optional(),
});

// Generate JWT token
function generateToken(userId: string, email: string): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }
    return jwt.sign({ userId, email }, jwtSecret, {
        expiresIn: '7d'
    });
}

// Register
router.post('/register', async (req, res: Response, next: NextFunction) => {
    try {
        const data = registerSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw badRequest('Email already registered');
        }

        const passwordHash = await bcrypt.hash(data.password, 12);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                name: data.name,
                isOnboarded: false,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isOnboarded: true,
                createdAt: true,
            },
        });

        const token = generateToken(user.id, user.email);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(201).json({ user, token });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Login
router.post('/login', async (req, res: Response, next: NextFunction) => {
    try {
        const data = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email: data.email },
            include: {
                campus: {
                    include: {
                        university: true,
                    },
                },
                enrollments: {
                    include: {
                        program: {
                            include: {
                                department: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user || !user.passwordHash) {
            throw unauthorized('Invalid credentials');
        }

        if (!user.isActive) {
            throw unauthorized('Account is deactivated');
        }

        const isValid = await bcrypt.compare(data.password, user.passwordHash);
        if (!isValid) {
            throw unauthorized('Invalid credentials');
        }

        // Update last active
        await prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
        });

        const token = generateToken(user.id, user.email);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                role: user.role,
                isOnboarded: user.isOnboarded,
                points: user.points,
                streak: user.streak,
                campus: user.campus,
                enrollments: user.enrollments,
            },
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Complete onboarding
router.post('/onboarding', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = onboardingSchema.parse(req.body);

        // Verify campus exists
        const campus = await prisma.campus.findUnique({
            where: { id: data.campusId },
        });
        if (!campus) {
            throw badRequest('Invalid campus');
        }

        // Verify program exists and belongs to a department under this campus
        const program = await prisma.program.findUnique({
            where: { id: data.programId },
            include: {
                department: true,
                semesters: {
                    where: { number: data.currentSemester },
                    include: {
                        subjects: {
                            where: { isCore: true },
                        },
                    },
                },
            },
        });
        if (!program) {
            throw badRequest('Invalid program');
        }

        // Start transaction
        await prisma.$transaction(async (tx) => {
            // Update user with campus
            await tx.user.update({
                where: { id: req.user!.id },
                data: {
                    campusId: data.campusId,
                    isOnboarded: true,
                },
            });

            // Create enrollment
            await tx.studentEnrollment.upsert({
                where: {
                    userId_programId: {
                        userId: req.user!.id,
                        programId: data.programId,
                    },
                },
                update: {
                    currentSemester: data.currentSemester,
                },
                create: {
                    userId: req.user!.id,
                    programId: data.programId,
                    currentSemester: data.currentSemester,
                    enrolledYear: new Date().getFullYear(),
                },
            });

            // Auto-enroll in core subjects for current semester
            const semester = program.semesters[0];
            if (semester) {
                for (const subject of semester.subjects) {
                    await tx.studentSubjectEnrollment.upsert({
                        where: {
                            userId_subjectId: {
                                userId: req.user!.id,
                                subjectId: subject.id,
                            },
                        },
                        update: {},
                        create: {
                            userId: req.user!.id,
                            subjectId: subject.id,
                            isElectiveChoice: false,
                        },
                    });
                }
            }

            // Enroll in selected electives
            if (data.electiveSubjectIds) {
                for (const subjectId of data.electiveSubjectIds) {
                    await tx.studentSubjectEnrollment.upsert({
                        where: {
                            userId_subjectId: {
                                userId: req.user!.id,
                                subjectId,
                            },
                        },
                        update: {},
                        create: {
                            userId: req.user!.id,
                            subjectId,
                            isElectiveChoice: true,
                        },
                    });
                }
            }
        });

        // Fetch updated user
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: {
                campus: {
                    include: {
                        university: true,
                    },
                },
                enrollments: {
                    include: {
                        program: {
                            include: {
                                department: true,
                            },
                        },
                    },
                },
                subjectEnrollments: {
                    include: {
                        subject: true,
                    },
                },
            },
        });

        res.json({ user, message: 'Onboarding completed successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: {
                campus: {
                    include: {
                        university: true,
                    },
                },
                enrollments: {
                    include: {
                        program: {
                            include: {
                                department: true,
                            },
                        },
                    },
                },
                subjectEnrollments: {
                    include: {
                        subject: {
                            include: {
                                semester: true,
                            },
                        },
                    },
                },
                achievements: {
                    include: {
                        achievement: true,
                    },
                    orderBy: {
                        earnedAt: 'desc',
                    },
                    take: 5,
                },
            },
        });

        if (!user) {
            throw unauthorized('User not found');
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                role: user.role,
                isOnboarded: user.isOnboarded,
                points: user.points,
                streak: user.streak,
                longestStreak: user.longestStreak,
                campus: user.campus,
                enrollments: user.enrollments,
                subjectEnrollments: user.subjectEnrollments,
                recentAchievements: user.achievements,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Update profile
router.patch('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, avatar, bio, phone } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: { name, avatar, bio, phone },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                phone: true,
                role: true,
            },
        });

        res.json({ user });
    } catch (error) {
        next(error);
    }
});

// Update elective choices
router.post('/electives', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { electiveSubjectIds } = req.body;

        if (!Array.isArray(electiveSubjectIds)) {
            throw badRequest('electiveSubjectIds must be an array');
        }

        // Remove old elective enrollments
        await prisma.studentSubjectEnrollment.deleteMany({
            where: {
                userId: req.user!.id,
                isElectiveChoice: true,
            },
        });

        // Add new elective enrollments
        for (const subjectId of electiveSubjectIds) {
            await prisma.studentSubjectEnrollment.create({
                data: {
                    userId: req.user!.id,
                    subjectId,
                    isElectiveChoice: true,
                },
            });
        }

        const subjectEnrollments = await prisma.studentSubjectEnrollment.findMany({
            where: { userId: req.user!.id },
            include: { subject: true },
        });

        res.json({ subjectEnrollments });
    } catch (error) {
        next(error);
    }
});

// Logout
router.post('/logout', (req, res: Response) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Change password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            throw badRequest('New password must be at least 8 characters');
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
        });

        if (!user?.passwordHash) {
            throw badRequest('Cannot change password for OAuth accounts');
        }

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw unauthorized('Current password is incorrect');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { passwordHash },
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
