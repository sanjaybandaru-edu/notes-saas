import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const createTopicSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().uuid().optional(),
    isPublic: z.boolean().optional(),
    order: z.number().optional(),
});

const updateTopicSchema = createTopicSchema.partial();

// List topics (public or user's own)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { parentId, flat } = req.query;

        const where = req.user
            ? {
                OR: [
                    { userId: req.user.id },
                    { isPublic: true },
                ],
            }
            : { isPublic: true };

        if (flat !== 'true') {
            // Return hierarchical structure
            const topics = await prisma.topic.findMany({
                where: {
                    ...where,
                    parentId: parentId as string || null,
                },
                include: {
                    children: {
                        where,
                        orderBy: { order: 'asc' },
                    },
                    _count: { select: { notes: true } },
                },
                orderBy: { order: 'asc' },
            });

            return res.json({ topics });
        }

        // Return flat list
        const topics = await prisma.topic.findMany({
            where,
            include: {
                _count: { select: { notes: true } },
            },
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });

        res.json({ topics });
    } catch (error) {
        next(error);
    }
});

// Get single topic
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const topic = await prisma.topic.findUnique({
            where: { id },
            include: {
                children: {
                    orderBy: { order: 'asc' },
                },
                notes: {
                    where: req.user ? {} : { isPublic: true },
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        excerpt: true,
                        isPublic: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                parent: true,
                _count: { select: { notes: true } },
            },
        });

        if (!topic) {
            throw notFound('Topic not found');
        }

        // Check access
        if (!topic.isPublic && topic.userId !== req.user?.id) {
            throw notFound('Topic not found');
        }

        res.json({ topic });
    } catch (error) {
        next(error);
    }
});

// Get topic by slug
router.get('/slug/:slug', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const topic = await prisma.topic.findFirst({
            where: {
                slug,
                OR: req.user
                    ? [{ userId: req.user.id }, { isPublic: true }]
                    : [{ isPublic: true }],
            },
            include: {
                children: {
                    orderBy: { order: 'asc' },
                },
                notes: {
                    where: req.user ? {} : { isPublic: true },
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        excerpt: true,
                        isPublic: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                parent: true,
            },
        });

        if (!topic) {
            throw notFound('Topic not found');
        }

        res.json({ topic });
    } catch (error) {
        next(error);
    }
});

// Create topic
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createTopicSchema.parse(req.body);

        // Check if slug exists for this user under same parent
        const existing = await prisma.topic.findFirst({
            where: {
                userId: req.user!.id,
                slug: data.slug,
                parentId: data.parentId || null,
            },
        });

        if (existing) {
            throw badRequest('Topic with this slug already exists');
        }

        const topic = await prisma.topic.create({
            data: {
                ...data,
                userId: req.user!.id,
            },
            include: {
                parent: true,
                _count: { select: { notes: true } },
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
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateTopicSchema.parse(req.body);

        const existing = await prisma.topic.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== req.user!.id) {
            throw notFound('Topic not found');
        }

        const topic = await prisma.topic.update({
            where: { id },
            data,
            include: {
                parent: true,
                _count: { select: { notes: true } },
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
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.topic.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== req.user!.id) {
            throw notFound('Topic not found');
        }

        await prisma.topic.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Reorder topics
router.post('/reorder', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { orders } = req.body as { orders: { id: string; order: number }[] };

        await Promise.all(
            orders.map(({ id, order }) =>
                prisma.topic.updateMany({
                    where: { id, userId: req.user!.id },
                    data: { order },
                })
            )
        );

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
