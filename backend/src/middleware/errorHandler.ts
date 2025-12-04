import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        error: message,
        code: err.code,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

export function createError(message: string, statusCode: number, code?: string): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

export function notFound(message = 'Resource not found'): AppError {
    return createError(message, 404, 'NOT_FOUND');
}

export function unauthorized(message = 'Unauthorized'): AppError {
    return createError(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden'): AppError {
    return createError(message, 403, 'FORBIDDEN');
}

export function badRequest(message = 'Bad request'): AppError {
    return createError(message, 400, 'BAD_REQUEST');
}
