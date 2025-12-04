import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from './errorHandler.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.slice(7)
            : req.cookies?.token;

        if (!token) {
            throw unauthorized('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
            email: string;
        };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            throw unauthorized('User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(unauthorized('Invalid token'));
        } else {
            next(error);
        }
    }
}

export function requireAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    if (req.user?.role !== 'ADMIN') {
        return next(unauthorized('Admin access required'));
    }
    next();
}

export function optionalAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : req.cookies?.token;

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
            email: string;
        };

        prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        }).then(user => {
            if (user) {
                req.user = user;
            }
            next();
        }).catch(() => next());
    } catch {
        next();
    }
}
