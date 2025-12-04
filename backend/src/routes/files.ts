import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';

const router = Router();

// Configure S3 Client
const s3Client = new S3Client({
    region: process.env.S3_BUCKET_REGION || process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'notes-saas-files';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/json',
            'application/zip',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/wav',
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    },
});

// Upload file
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        const { noteId } = req.body;

        if (!file) {
            throw badRequest('No file provided');
        }

        // Generate unique key
        const ext = file.originalname.split('.').pop();
        const key = `${req.user!.id}/${uuid()}.${ext}`;

        // Upload to S3
        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            })
        );

        // Generate URL
        const url = `https://${BUCKET_NAME}.s3.${process.env.S3_BUCKET_REGION}.amazonaws.com/${key}`;

        // Save to database
        const fileRecord = await prisma.file.create({
            data: {
                name: file.originalname,
                key,
                url,
                size: file.size,
                mimeType: file.mimetype,
                userId: req.user!.id,
                noteId: noteId || null,
            },
        });

        res.status(201).json({ file: fileRecord });
    } catch (error) {
        next(error);
    }
});

// List user's files
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { noteId, limit = '20', offset = '0' } = req.query;

        const where: any = { userId: req.user!.id };
        if (noteId) {
            where.noteId = noteId as string;
        }

        const [files, total] = await Promise.all([
            prisma.file.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            prisma.file.count({ where }),
        ]);

        res.json({ files, total });
    } catch (error) {
        next(error);
    }
});

// Get signed download URL
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const file = await prisma.file.findUnique({
            where: { id },
        });

        if (!file || file.userId !== req.user!.id) {
            throw notFound('File not found');
        }

        // Generate signed URL (valid for 1 hour)
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: file.key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.json({ url: signedUrl, file });
    } catch (error) {
        next(error);
    }
});

// Get presigned URL for direct upload
router.post('/presigned-url', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { filename, contentType } = req.body;

        if (!filename || !contentType) {
            throw badRequest('filename and contentType are required');
        }

        const ext = filename.split('.').pop();
        const key = `${req.user!.id}/${uuid()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.S3_BUCKET_REGION}.amazonaws.com/${key}`;

        res.json({ uploadUrl: signedUrl, key, publicUrl });
    } catch (error) {
        next(error);
    }
});

// Confirm upload (after direct upload to S3)
router.post('/confirm', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { key, name, size, mimeType, noteId } = req.body;

        if (!key || !name || !size || !mimeType) {
            throw badRequest('key, name, size, and mimeType are required');
        }

        const url = `https://${BUCKET_NAME}.s3.${process.env.S3_BUCKET_REGION}.amazonaws.com/${key}`;

        const file = await prisma.file.create({
            data: {
                name,
                key,
                url,
                size,
                mimeType,
                userId: req.user!.id,
                noteId: noteId || null,
            },
        });

        res.status(201).json({ file });
    } catch (error) {
        next(error);
    }
});

// Delete file
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const file = await prisma.file.findUnique({
            where: { id },
        });

        if (!file || file.userId !== req.user!.id) {
            throw notFound('File not found');
        }

        // Delete from S3
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file.key,
            })
        );

        // Delete from database
        await prisma.file.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Attach file to note
router.post('/:id/attach', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { noteId } = req.body;

        const file = await prisma.file.findUnique({
            where: { id },
        });

        if (!file || file.userId !== req.user!.id) {
            throw notFound('File not found');
        }

        const note = await prisma.note.findUnique({
            where: { id: noteId },
        });

        if (!note || note.userId !== req.user!.id) {
            throw notFound('Note not found');
        }

        const updated = await prisma.file.update({
            where: { id },
            data: { noteId },
        });

        res.json({ file: updated });
    } catch (error) {
        next(error);
    }
});

export default router;
