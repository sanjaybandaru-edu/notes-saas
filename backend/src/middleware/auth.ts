import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { unauthorized, forbidden } from './errorHandler.js';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        isOnboarded?: boolean;
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
            select: { id: true, email: true, role: true, isOnboarded: true, isActive: true },
        });

        if (!user) {
            throw unauthorized('User not found');
        }

        if (!user.isActive) {
            throw unauthorized('Account is deactivated');
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

// Role-based access control middleware
export function requireRole(allowedRoles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(unauthorized('Authentication required'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`));
        }

        next();
    };
}

// Legacy requireAdmin for backwards compatibility
export function requireAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    if (!req.user) {
        return next(unauthorized('Authentication required'));
    }

    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
        return next(forbidden('Admin access required'));
    }
    next();
}

// Require onboarding to be completed
export function requireOnboarded(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    if (!req.user) {
        return next(unauthorized('Authentication required'));
    }

    if (!req.user.isOnboarded) {
        return next(forbidden('Please complete onboarding first'));
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
            select: { id: true, email: true, role: true, isOnboarded: true },
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
