// src/utils/errors.js
const logger = require('../config/logger');

class BaseError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Para distinguir errores operacionales vs programación
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends BaseError {
    constructor(message, details = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            details: this.details,
            status: this.statusCode
        };
    }
}

class AuthenticationError extends BaseError {
    constructor(message = 'Error de autenticación') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            status: this.statusCode
        };
    }
}

class ForbiddenError extends BaseError {
    constructor(message = 'Acceso denegado') {
        super(message, 403, 'FORBIDDEN_ERROR');
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            status: this.statusCode
        };
    }
}

class NotFoundError extends BaseError {
    constructor(message = 'Recurso no encontrado') {
        super(message, 404, 'NOT_FOUND_ERROR');
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            status: this.statusCode
        };
    }
}

class ConflictError extends BaseError {
    constructor(message = 'Conflicto con el recurso existente', details = null) {
        super(message, 409, 'CONFLICT_ERROR');
        this.details = details;
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            details: this.details,
            status: this.statusCode
        };
    }
}

class RateLimitError extends BaseError {
    constructor(message = 'Demasiadas solicitudes', retryAfter = null) {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.retryAfter = retryAfter;
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            retryAfter: this.retryAfter,
            status: this.statusCode
        };
    }
}

class DatabaseError extends BaseError {
    constructor(message = 'Error en la base de datos', originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            details: process.env.NODE_ENV === 'development' ? this.originalError : undefined,
            status: this.statusCode
        };
    }
}

class BusinessLogicError extends BaseError {
    constructor(message, details = null) {
        super(message, 422, 'BUSINESS_LOGIC_ERROR');
        this.details = details;
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            details: this.details,
            status: this.statusCode
        };
    }
}

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    logger.error({
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });

    // Si el error ya es uno de nuestros errores personalizados
    if (err instanceof BaseError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    // Manejar errores específicos de TypeORM
    if (err.name === 'QueryFailedError') {
        const dbError = new DatabaseError(
            'Error en la operación de base de datos',
            process.env.NODE_ENV === 'development' ? err.message : undefined
        );
        return res.status(dbError.statusCode).json(dbError.toJSON());
    }

    // Manejar errores de validación de Express
    if (err.name === 'ValidationError') {
        const validationError = new ValidationError(
            'Error de validación',
            err.errors
        );
        return res.status(validationError.statusCode).json(validationError.toJSON());
    }

    // Manejar errores de JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        const authError = new AuthenticationError(
            'Token inválido o expirado'
        );
        return res.status(authError.statusCode).json(authError.toJSON());
    }

    // Error por defecto para errores no manejados específicamente
    const defaultError = {
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500
    };

    return res.status(500).json(defaultError);
};

// Middleware para manejar errores de tipo 404 (rutas no encontradas)
const notFoundHandler = (req, res) => {
    const notFoundError = new NotFoundError(
        `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    );
    logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(notFoundError.statusCode).json(notFoundError.toJSON());
};

module.exports = {
    BaseError,
    ValidationError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    BusinessLogicError,
    errorHandler,
    notFoundHandler
};
