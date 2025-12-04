import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const createNoteSchema = z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
    content: z.string(),
    excerpt: z.string().optional(),
    topicId: z.string().uuid(),
    isPublic: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    order: z.number().optional(),
    tags: z.array(z.string()).optional(),
});

const updateNoteSchema = createNoteSchema.partial();

// List notes
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { topicId, search, tag, limit = '20', offset = '0' } = req.query;

        const where: any = req.user
            ? {
                OR: [
                    { userId: req.user.id },
                    { isPublic: true },
                ],
            }
            : { isPublic: true };

        if (topicId) {
            where.topicId = topicId as string;
        }

        if (search) {
            where.OR = [
                { title: { contains: search as string, mode: 'insensitive' } },
                { content: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        if (tag) {
            where.tags = {
                some: { slug: tag as string },
            };
        }

        const [notes, total] = await Promise.all([
            prisma.note.findMany({
                where,
                include: {
                    topic: {
                        select: { id: true, name: true, slug: true },
                    },
                    tags: true,
                    _count: { select: { files: true } },
                },
                orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                take: Number(limit),
                skip: Number(offset),
            }),
            prisma.note.count({ where }),
        ]);

        res.json({ notes, total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
        next(error);
    }
});

// Get single note
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const note = await prisma.note.findUnique({
            where: { id },
            include: {
                topic: {
                    include: {
                        parent: true,
                    },
                },
                tags: true,
                files: true,
                user: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        });

        if (!note) {
            throw notFound('Note not found');
        }

        // Check access
        if (!note.isPublic && note.userId !== req.user?.id) {
            throw notFound('Note not found');
        }

        // Increment view count for public notes
        if (note.isPublic) {
            await prisma.note.update({
                where: { id },
                data: { views: { increment: 1 } },
            });
        }

        res.json({ note });
    } catch (error) {
        next(error);
    }
});

// Get note by slug
router.get('/slug/:topicSlug/:noteSlug', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { topicSlug, noteSlug } = req.params;

        const topic = await prisma.topic.findFirst({
            where: {
                slug: topicSlug,
                OR: req.user
                    ? [{ userId: req.user.id }, { isPublic: true }]
                    : [{ isPublic: true }],
            },
        });

        if (!topic) {
            throw notFound('Topic not found');
        }

        const note = await prisma.note.findFirst({
            where: {
                slug: noteSlug,
                topicId: topic.id,
                OR: req.user
                    ? [{ userId: req.user.id }, { isPublic: true }]
                    : [{ isPublic: true }],
            },
            include: {
                topic: {
                    include: { parent: true },
                },
                tags: true,
                files: true,
                user: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        });

        if (!note) {
            throw notFound('Note not found');
        }

        res.json({ note });
    } catch (error) {
        next(error);
    }
});

// Create note
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createNoteSchema.parse(req.body);

        // Verify topic ownership
        const topic = await prisma.topic.findUnique({
            where: { id: data.topicId },
        });

        if (!topic || topic.userId !== req.user!.id) {
            throw notFound('Topic not found');
        }

        // Check slug uniqueness
        const existing = await prisma.note.findFirst({
            where: {
                slug: data.slug,
                topicId: data.topicId,
            },
        });

        if (existing) {
            throw badRequest('Note with this slug already exists in this topic');
        }

        const { tags, ...noteData } = data;

        const note = await prisma.note.create({
            data: {
                ...noteData,
                userId: req.user!.id,
                publishedAt: !noteData.isDraft ? new Date() : null,
                tags: tags ? {
                    connectOrCreate: tags.map(tag => ({
                        where: { slug: tag.toLowerCase().replace(/\s+/g, '-') },
                        create: { name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') },
                    })),
                } : undefined,
            },
            include: {
                topic: true,
                tags: true,
            },
        });

        res.status(201).json({ note });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Update note
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateNoteSchema.parse(req.body);

        const existing = await prisma.note.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== req.user!.id) {
            throw notFound('Note not found');
        }

        const { tags, ...noteData } = data;

        // Handle publishing
        if (data.isDraft === false && existing.isDraft) {
            (noteData as any).publishedAt = new Date();
        }

        const note = await prisma.note.update({
            where: { id },
            data: {
                ...noteData,
                tags: tags ? {
                    set: [],
                    connectOrCreate: tags.map(tag => ({
                        where: { slug: tag.toLowerCase().replace(/\s+/g, '-') },
                        create: { name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') },
                    })),
                } : undefined,
            },
            include: {
                topic: true,
                tags: true,
                files: true,
            },
        });

        res.json({ note });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Delete note
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const existing = await prisma.note.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== req.user!.id) {
            throw notFound('Note not found');
        }

        await prisma.note.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Reorder notes
router.post('/reorder', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { orders } = req.body as { orders: { id: string; order: number }[] };

        await Promise.all(
            orders.map(({ id, order }) =>
                prisma.note.updateMany({
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

// Get all tags
router.get('/meta/tags', async (req, res: Response, next: NextFunction) => {
    try {
        const tags = await prisma.tag.findMany({
            include: {
                _count: { select: { notes: true } },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ tags });
    } catch (error) {
        next(error);
    }
});

export default router;
