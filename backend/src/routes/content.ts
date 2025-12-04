import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest, requireRole, optionalAuth } from '../middleware/auth.js';
import { badRequest, notFound, forbidden } from '../middleware/errorHandler.js';
import { z } from 'zod';
import { ContentStatus } from '@prisma/client';

const router = Router();

// ============= VALIDATION SCHEMAS =============

const createChapterSchema = z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
    order: z.number().int().min(0).optional(),
    subjectId: z.string().uuid(),
});

const updateChapterSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().optional(),
    order: z.number().int().min(0).optional(),
    status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
    isVisible: z.boolean().optional(),
});

const createTopicSchema = z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    content: z.string(),
    excerpt: z.string().max(500).optional(),
    order: z.number().int().min(0).optional(),
    chapterId: z.string().uuid(),
    metaTitle: z.string().max(100).optional(),
    metaDescription: z.string().max(200).optional(),
});

const updateTopicSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    content: z.string().optional(),
    excerpt: z.string().max(500).optional(),
    order: z.number().int().min(0).optional(),
    status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
    isVisible: z.boolean().optional(),
    metaTitle: z.string().max(100).optional(),
    metaDescription: z.string().max(200).optional(),
    scheduledAt: z.string().datetime().optional(),
});

// ============= CHAPTER ROUTES =============

// Get all chapters for a subject
router.get('/subjects/:subjectId/chapters', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { subjectId } = req.params;
        const isAdmin = req.user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR'].includes(req.user.role);

        const where: any = { subjectId };
        if (!isAdmin) {
            where.isVisible = true;
            where.status = 'PUBLISHED';
        }

        const chapters = await prisma.chapter.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                topics: {
                    where: isAdmin ? {} : { isVisible: true, status: 'PUBLISHED' },
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        excerpt: true,
                        order: true,
                        status: true,
                    },
                },
                _count: {
                    select: { topics: true },
                },
            },
        });

        res.json({ chapters });
    } catch (error) {
        next(error);
    }
});

// Get single chapter
router.get('/chapters/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR'].includes(req.user.role);

        const chapter = await prisma.chapter.findUnique({
            where: { id },
            include: {
                subject: {
                    include: {
                        semester: {
                            include: {
                                program: true,
                            },
                        },
                    },
                },
                topics: {
                    where: isAdmin ? {} : { isVisible: true, status: 'PUBLISHED' },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!chapter) {
            throw notFound('Chapter not found');
        }

        if (!isAdmin && (!chapter.isVisible || chapter.status !== 'PUBLISHED')) {
            throw notFound('Chapter not found');
        }

        res.json({ chapter });
    } catch (error) {
        next(error);
    }
});

// Create chapter
router.post('/chapters', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createChapterSchema.parse(req.body);

        // Check if subject exists
        const subject = await prisma.subject.findUnique({
            where: { id: data.subjectId },
        });
        if (!subject) {
            throw badRequest('Subject not found');
        }

        // Get max order if not provided
        let order = data.order;
        if (order === undefined) {
            const maxOrder = await prisma.chapter.findFirst({
                where: { subjectId: data.subjectId },
                orderBy: { order: 'desc' },
                select: { order: true },
            });
            order = (maxOrder?.order ?? -1) + 1;
        }

        const chapter = await prisma.chapter.create({
            data: {
                title: data.title,
                slug: data.slug,
                description: data.description,
                order,
                subjectId: data.subjectId,
            },
            include: {
                subject: true,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entityType: 'Chapter',
                entityId: chapter.id,
                entityName: chapter.title,
                userId: req.user!.id,
            },
        });

        res.status(201).json({ chapter });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Update chapter
router.patch('/chapters/:id', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateChapterSchema.parse(req.body);

        const existing = await prisma.chapter.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Chapter not found');
        }

        const chapter = await prisma.chapter.update({
            where: { id },
            data,
            include: {
                subject: true,
                _count: { select: { topics: true } },
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entityType: 'Chapter',
                entityId: chapter.id,
                entityName: chapter.title,
                changes: { before: existing, after: data },
                userId: req.user!.id,
            },
        });

        res.json({ chapter });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Delete chapter
router.delete('/chapters/:id', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.chapter.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Chapter not found');
        }

        await prisma.chapter.delete({ where: { id } });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entityType: 'Chapter',
                entityId: id,
                entityName: existing.title,
                userId: req.user!.id,
            },
        });

        res.json({ message: 'Chapter deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// Reorder chapters
router.post('/subjects/:subjectId/chapters/reorder', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { subjectId } = req.params;
        const { chapterIds } = req.body;

        if (!Array.isArray(chapterIds)) {
            throw badRequest('chapterIds must be an array');
        }

        await prisma.$transaction(
            chapterIds.map((id, index) =>
                prisma.chapter.update({
                    where: { id },
                    data: { order: index },
                })
            )
        );

        res.json({ message: 'Chapters reordered successfully' });
    } catch (error) {
        next(error);
    }
});

// ============= TOPIC ROUTES =============

// Get single topic
router.get('/topics/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR'].includes(req.user.role);

        const topic = await prisma.topic.findUnique({
            where: { id },
            include: {
                chapter: {
                    include: {
                        subject: {
                            include: {
                                semester: {
                                    include: {
                                        program: {
                                            include: {
                                                department: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        topics: {
                            where: isAdmin ? {} : { isVisible: true, status: 'PUBLISHED' },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                order: true,
                            },
                        },
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

        if (!isAdmin && (!topic.isVisible || topic.status !== 'PUBLISHED')) {
            throw notFound('Topic not found');
        }

        // Find prev/next topics for navigation
        const allTopics = topic.chapter.topics;
        const currentIndex = allTopics.findIndex(t => t.id === topic.id);
        const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null;
        const nextTopic = currentIndex < allTopics.length - 1 ? allTopics[currentIndex + 1] : null;

        res.json({
            topic,
            navigation: {
                prev: prevTopic,
                next: nextTopic,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Create topic
router.post('/topics', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createTopicSchema.parse(req.body);

        // Check if chapter exists
        const chapter = await prisma.chapter.findUnique({
            where: { id: data.chapterId },
        });
        if (!chapter) {
            throw badRequest('Chapter not found');
        }

        // Get max order if not provided
        let order = data.order;
        if (order === undefined) {
            const maxOrder = await prisma.topic.findFirst({
                where: { chapterId: data.chapterId },
                orderBy: { order: 'desc' },
                select: { order: true },
            });
            order = (maxOrder?.order ?? -1) + 1;
        }

        const topic = await prisma.topic.create({
            data: {
                title: data.title,
                slug: data.slug,
                content: data.content,
                excerpt: data.excerpt || data.content.substring(0, 200).replace(/[#*`]/g, ''),
                order,
                chapterId: data.chapterId,
                createdById: req.user!.id,
                metaTitle: data.metaTitle,
                metaDescription: data.metaDescription,
            },
            include: {
                chapter: true,
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        // Create initial version
        await prisma.topicVersion.create({
            data: {
                topicId: topic.id,
                version: 1,
                content: data.content,
                changelog: 'Initial version',
                createdById: req.user!.id,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entityType: 'Topic',
                entityId: topic.id,
                entityName: topic.title,
                userId: req.user!.id,
            },
        });

        res.status(201).json({ topic });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Update topic
router.patch('/topics/:id', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateTopicSchema.parse(req.body);
        const { changelog } = req.body;

        const existing = await prisma.topic.findUnique({
            where: { id },
            include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
        });
        if (!existing) {
            throw notFound('Topic not found');
        }

        // Update topic
        const updateData: any = { ...data };
        if (data.scheduledAt) {
            updateData.scheduledAt = new Date(data.scheduledAt);
        }

        // Handle status transitions
        if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
            updateData.publishedAt = new Date();
        }

        const topic = await prisma.topic.update({
            where: { id },
            data: updateData,
            include: {
                chapter: true,
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        // Create version if content changed
        if (data.content && data.content !== existing.content) {
            const latestVersion = existing.versions[0]?.version ?? 0;
            await prisma.topicVersion.create({
                data: {
                    topicId: topic.id,
                    version: latestVersion + 1,
                    content: data.content,
                    changelog: changelog || 'Content updated',
                    createdById: req.user!.id,
                },
            });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entityType: 'Topic',
                entityId: topic.id,
                entityName: topic.title,
                changes: { fields: Object.keys(data) },
                userId: req.user!.id,
            },
        });

        res.json({ topic });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Delete topic
router.delete('/topics/:id', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.topic.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Topic not found');
        }

        await prisma.topic.delete({ where: { id } });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entityType: 'Topic',
                entityId: id,
                entityName: existing.title,
                userId: req.user!.id,
            },
        });

        res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// Reorder topics in a chapter
router.post('/chapters/:chapterId/topics/reorder', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { chapterId } = req.params;
        const { topicIds } = req.body;

        if (!Array.isArray(topicIds)) {
            throw badRequest('topicIds must be an array');
        }

        await prisma.$transaction(
            topicIds.map((id, index) =>
                prisma.topic.update({
                    where: { id },
                    data: { order: index },
                })
            )
        );

        res.json({ message: 'Topics reordered successfully' });
    } catch (error) {
        next(error);
    }
});

// ============= VERSION HISTORY =============

// Get topic versions
router.get('/topics/:id/versions', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const versions = await prisma.topicVersion.findMany({
            where: { topicId: id },
            orderBy: { version: 'desc' },
            include: {
                createdBy: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        });

        res.json({ versions });
    } catch (error) {
        next(error);
    }
});

// Get specific version
router.get('/topics/:id/versions/:version', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id, version } = req.params;

        const topicVersion = await prisma.topicVersion.findUnique({
            where: {
                topicId_version: {
                    topicId: id,
                    version: parseInt(version),
                },
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        });

        if (!topicVersion) {
            throw notFound('Version not found');
        }

        res.json({ version: topicVersion });
    } catch (error) {
        next(error);
    }
});

// Restore version
router.post('/topics/:id/versions/:version/restore', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id, version } = req.params;

        const topicVersion = await prisma.topicVersion.findUnique({
            where: {
                topicId_version: {
                    topicId: id,
                    version: parseInt(version),
                },
            },
        });

        if (!topicVersion) {
            throw notFound('Version not found');
        }

        // Get latest version number
        const latestVersion = await prisma.topicVersion.findFirst({
            where: { topicId: id },
            orderBy: { version: 'desc' },
        });

        // Update topic with version content
        const topic = await prisma.topic.update({
            where: { id },
            data: { content: topicVersion.content },
        });

        // Create new version
        await prisma.topicVersion.create({
            data: {
                topicId: id,
                version: (latestVersion?.version ?? 0) + 1,
                content: topicVersion.content,
                changelog: `Restored from version ${version}`,
                createdById: req.user!.id,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'RESTORE',
                entityType: 'Topic',
                entityId: id,
                entityName: topic.title,
                changes: { restoredFromVersion: parseInt(version) },
                userId: req.user!.id,
            },
        });

        res.json({ topic, message: `Restored from version ${version}` });
    } catch (error) {
        next(error);
    }
});

// ============= REVIEW WORKFLOW =============

// Submit for review
router.post('/topics/:id/submit-review', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.topic.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Topic not found');
        }

        if (existing.status !== 'DRAFT') {
            throw badRequest('Only draft topics can be submitted for review');
        }

        const topic = await prisma.topic.update({
            where: { id },
            data: { status: 'IN_REVIEW' },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'SUBMIT_REVIEW',
                entityType: 'Topic',
                entityId: id,
                entityName: topic.title,
                userId: req.user!.id,
            },
        });

        res.json({ topic, message: 'Topic submitted for review' });
    } catch (error) {
        next(error);
    }
});

// Approve topic
router.post('/topics/:id/approve', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.topic.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Topic not found');
        }

        if (existing.status !== 'IN_REVIEW') {
            throw badRequest('Only topics in review can be approved');
        }

        const topic = await prisma.topic.update({
            where: { id },
            data: { status: 'APPROVED' },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'APPROVE',
                entityType: 'Topic',
                entityId: id,
                entityName: topic.title,
                userId: req.user!.id,
            },
        });

        res.json({ topic, message: 'Topic approved' });
    } catch (error) {
        next(error);
    }
});

// Publish topic
router.post('/topics/:id/publish', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.topic.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Topic not found');
        }

        if (existing.status !== 'APPROVED' && existing.status !== 'DRAFT') {
            throw badRequest('Topic must be approved or draft to publish');
        }

        const topic = await prisma.topic.update({
            where: { id },
            data: {
                status: 'PUBLISHED',
                publishedAt: new Date(),
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'PUBLISH',
                entityType: 'Topic',
                entityId: id,
                entityName: topic.title,
                userId: req.user!.id,
            },
        });

        res.json({ topic, message: 'Topic published' });
    } catch (error) {
        next(error);
    }
});

// Reject topic (send back to draft)
router.post('/topics/:id/reject', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const existing = await prisma.topic.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Topic not found');
        }

        const topic = await prisma.topic.update({
            where: { id },
            data: { status: 'DRAFT' },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'REJECT',
                entityType: 'Topic',
                entityId: id,
                entityName: topic.title,
                changes: { reason },
                userId: req.user!.id,
            },
        });

        res.json({ topic, message: 'Topic sent back to draft' });
    } catch (error) {
        next(error);
    }
});

// Archive topic
router.post('/topics/:id/archive', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.topic.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Topic not found');
        }

        const topic = await prisma.topic.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'ARCHIVE',
                entityType: 'Topic',
                entityId: id,
                entityName: topic.title,
                userId: req.user!.id,
            },
        });

        res.json({ topic, message: 'Topic archived' });
    } catch (error) {
        next(error);
    }
});

export default router;
