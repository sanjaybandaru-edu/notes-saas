import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createTemplateSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    content: z.string(),
    category: z.string().min(1).max(50),
    isGlobal: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    content: z.string().optional(),
    category: z.string().min(1).max(50).optional(),
    isGlobal: z.boolean().optional(),
});

// Get all templates
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { category } = req.query;
        const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user!.role);

        const templates = await prisma.contentTemplate.findMany({
            where: {
                OR: [
                    { isGlobal: true },
                    { createdById: req.user!.id },
                    ...(isAdmin ? [{ isGlobal: false }] : []),
                ],
                ...(category && { category: category as string }),
            },
            orderBy: [
                { isGlobal: 'desc' },
                { name: 'asc' },
            ],
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        res.json({ templates });
    } catch (error) {
        next(error);
    }
});

// Get template categories
router.get('/categories', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const categories = await prisma.contentTemplate.groupBy({
            by: ['category'],
            _count: true,
        });

        res.json({
            categories: categories.map(c => ({
                name: c.category,
                count: c._count,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// Get single template
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const template = await prisma.contentTemplate.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!template) {
            throw notFound('Template not found');
        }

        res.json({ template });
    } catch (error) {
        next(error);
    }
});

// Create template
router.post('/', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createTemplateSchema.parse(req.body);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user!.role);

        const template = await prisma.contentTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                content: data.content,
                category: data.category,
                isGlobal: isAdmin ? (data.isGlobal ?? false) : false,
                createdById: req.user!.id,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        res.status(201).json({ template });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Update template
router.patch('/:id', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateTemplateSchema.parse(req.body);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user!.role);

        const existing = await prisma.contentTemplate.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Template not found');
        }

        // Only admin can edit global templates or other users' templates
        if (!isAdmin && existing.createdById !== req.user!.id) {
            throw badRequest('Cannot edit this template');
        }

        const updateData: any = { ...data };
        // Only admins can set isGlobal
        if (!isAdmin) {
            delete updateData.isGlobal;
        }

        const template = await prisma.contentTemplate.update({
            where: { id },
            data: updateData,
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        res.json({ template });
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(badRequest(error.errors[0].message));
        } else {
            next(error);
        }
    }
});

// Delete template
router.delete('/:id', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user!.role);

        const existing = await prisma.contentTemplate.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Template not found');
        }

        // Only admin can delete global templates or other users' templates
        if (!isAdmin && existing.createdById !== req.user!.id) {
            throw badRequest('Cannot delete this template');
        }

        await prisma.contentTemplate.delete({ where: { id } });

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// Duplicate template
router.post('/:id/duplicate', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CONTRIBUTOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const existing = await prisma.contentTemplate.findUnique({ where: { id } });
        if (!existing) {
            throw notFound('Template not found');
        }

        const template = await prisma.contentTemplate.create({
            data: {
                name: name || `${existing.name} (Copy)`,
                description: existing.description,
                content: existing.content,
                category: existing.category,
                isGlobal: false,
                createdById: req.user!.id,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        res.status(201).json({ template });
    } catch (error) {
        next(error);
    }
});

export default router;

// ============= DEFAULT TEMPLATES =============
// These would be seeded in the database

export const defaultTemplates = [
    {
        name: 'Lecture Notes',
        description: 'Standard template for lecture notes',
        category: 'lecture',
        isGlobal: true,
        content: `# Lecture Title

## Learning Objectives

By the end of this lecture, you will be able to:

- Objective 1
- Objective 2
- Objective 3

## Introduction

Brief introduction to the topic.

## Main Content

### Section 1

Content here...

### Section 2

Content here...

## Key Takeaways

- Point 1
- Point 2
- Point 3

## Further Reading

- Resource 1
- Resource 2
`,
    },
    {
        name: 'Lab Manual',
        description: 'Template for laboratory experiments',
        category: 'lab',
        isGlobal: true,
        content: `# Lab Title

## Objective

State the objective of this lab.

## Prerequisites

- Prerequisite 1
- Prerequisite 2

## Materials Required

- Material 1
- Material 2

## Theory

Brief theoretical background.

## Procedure

1. Step 1
2. Step 2
3. Step 3

## Observations

Record your observations here.

## Results

Present your results.

## Conclusion

Summarize your findings.

## Viva Questions

1. Question 1?
2. Question 2?
`,
    },
    {
        name: 'Assignment',
        description: 'Template for assignments and exercises',
        category: 'assignment',
        isGlobal: true,
        content: `# Assignment Title

**Due Date**: YYYY-MM-DD
**Total Marks**: XX

## Instructions

- Instruction 1
- Instruction 2

## Questions

### Question 1 (X marks)

Question text...

### Question 2 (X marks)

Question text...

## Submission Guidelines

- Guideline 1
- Guideline 2
`,
    },
    {
        name: 'Tutorial',
        description: 'Step-by-step tutorial template',
        category: 'tutorial',
        isGlobal: true,
        content: `# Tutorial Title

## Overview

Brief overview of what we will learn.

## Prerequisites

Before starting, you should know:

- Prerequisite 1
- Prerequisite 2

## Step 1: Title

Description...

\`\`\`code
// Code example
\`\`\`

## Step 2: Title

Description...

## Step 3: Title

Description...

## Summary

What we learned:

- Point 1
- Point 2

## Next Steps

Where to go from here.
`,
    },
];
