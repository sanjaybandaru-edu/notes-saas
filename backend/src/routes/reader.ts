import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';

const router = Router();

// ============= BOOKMARKS =============

// Get user's bookmarks
router.get('/bookmarks', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: req.user!.id },
            include: {
                topic: {
                    include: {
                        chapter: {
                            include: {
                                subject: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ bookmarks });
    } catch (error) {
        next(error);
    }
});

// Add bookmark
router.post('/bookmarks', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { topicId, note } = req.body;

        if (!topicId) {
            throw badRequest('topicId is required');
        }

        const topic = await prisma.topic.findUnique({ where: { id: topicId } });
        if (!topic) {
            throw notFound('Topic not found');
        }

        const bookmark = await prisma.bookmark.upsert({
            where: {
                userId_topicId: {
                    userId: req.user!.id,
                    topicId,
                },
            },
            update: { note },
            create: {
                userId: req.user!.id,
                topicId,
                note,
            },
            include: {
                topic: {
                    select: { id: true, title: true, slug: true },
                },
            },
        });

        res.status(201).json({ bookmark });
    } catch (error) {
        next(error);
    }
});

// Remove bookmark
router.delete('/bookmarks/:topicId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { topicId } = req.params;

        await prisma.bookmark.deleteMany({
            where: {
                userId: req.user!.id,
                topicId,
            },
        });

        res.json({ message: 'Bookmark removed' });
    } catch (error) {
        next(error);
    }
});

// Check if topic is bookmarked
router.get('/bookmarks/:topicId/check', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { topicId } = req.params;

        const bookmark = await prisma.bookmark.findUnique({
            where: {
                userId_topicId: {
                    userId: req.user!.id,
                    topicId,
                },
            },
        });

        res.json({ isBookmarked: !!bookmark });
    } catch (error) {
        next(error);
    }
});

export default router;
