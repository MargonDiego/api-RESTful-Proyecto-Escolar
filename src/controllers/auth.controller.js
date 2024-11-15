// src/controllers/auth.controller.js
const BaseController = require('./base.controller');
const { ForbiddenError, NotFoundError, ValidationError } = require('../utils/errors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cache = require('../config/cache');
const { getConnection } = require('typeorm');

class AuthController extends BaseController {
    constructor() {
        super('Auth');
        this.blacklistedTokens = new Set();
    }

    async getUserRepository() {
        const connection = getConnection();
        return connection.getRepository('User');
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const cacheKey = cache.generateKey('user_login', { email });
            let user = await cache.get(cacheKey);
            const userRepository = await this.getUserRepository();

            if (!user) {
                user = await userRepository.findOne({
                    where: { email },
                    select: ['id', 'email', 'password', 'firstName', 'lastName',
                        'role', 'isActive', 'lastLogin', 'loginAttempts',
                        'lastLoginAttempt']
                });
                if (user) await cache.set(cacheKey, user, 300);
            }

            if (user?.loginAttempts >= 5 &&
                (new Date().getTime() - new Date(user.lastLoginAttempt).getTime()) < 15 * 60 * 1000) {
                await this.logAction('LOGIN_BLOCKED', null, user?.id, null,
                    { reason: 'Demasiados intentos fallidos' },
                    'Cuenta bloqueada temporalmente', req);
                return res.status(429).json({
                    error: 'Cuenta bloqueada temporalmente',
                    message: 'Demasiados intentos fallidos. Intente nuevamente en 15 minutos.'
                });
            }

            if (!user) {
                await this.logAction('LOGIN_FAILED', null, null, { email }, null,
                    'Intento de login con email no registrado', req);
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            if (!user.isActive) {
                await this.logAction('LOGIN_FAILED', null, user.id, null,
                    { reason: 'Usuario inactivo' },
                    'Intento de login con usuario inactivo', req);
                return res.status(401).json({ error: 'Usuario desactivado' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                await userRepository.update(user.id, {
                    loginAttempts: (user.loginAttempts || 0) + 1,
                    lastLoginAttempt: new Date()
                });
                await cache.delete(cacheKey);
                await this.logAction('LOGIN_FAILED', null, user.id, null,
                    { reason: 'Contraseña incorrecta' },
                    'Intento de login con contraseña incorrecta', req);
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const tokens = this.generateTokens(user);
            const tokenHash = crypto.createHash('sha256')
                .update(tokens.refreshToken)
                .digest('hex');

            await userRepository.update(user.id, {
                lastLogin: new Date(),
                loginAttempts: 0,
                lastLoginAttempt: null,
                tokens: [...(user.tokens || []), tokenHash]
            });

            await this.logAction('LOGIN', null, user.id, null,
                { email: user.email }, 'Login exitoso', req);

            await cache.set(cacheKey, user, 3600);

            return res.json({
                message: 'Login exitoso',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role
                    },
                    tokens
                }
            });
        } catch (error) {
            return this.handleError(error, 'login');
        }
    }

    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Token de refresco requerido' });
            }

            const tokenHash = crypto.createHash('sha256')
                .update(refreshToken)
                .digest('hex');
            if (this.blacklistedTokens.has(tokenHash)) {
                return res.status(401).json({ error: 'Token de refresco inválido' });
            }

            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const cacheKey = cache.generateKey('user_login', { id: decoded.id });
            const userRepository = await this.getUserRepository();
            let user = await cache.get(cacheKey);

            if (!user) {
                user = await userRepository.findOne({
                    where: { id: decoded.id },
                    select: ['id', 'email', 'firstName', 'lastName', 'role',
                        'isActive', 'tokens']
                });
                if (user) await cache.set(cacheKey, user, 300);
            }

            if (!user || !user.isActive || !user.tokens.includes(tokenHash)) {
                return res.status(401).json({ error: 'Token de refresco inválido' });
            }

            const newTokens = this.generateTokens(user);
            const newTokenHash = crypto.createHash('sha256')
                .update(newTokens.refreshToken)
                .digest('hex');

            await userRepository.update(user.id, {
                tokens: user.tokens.filter(t => t !== tokenHash)
                    .concat(newTokenHash)
            });
            this.blacklistedTokens.add(tokenHash);

            await this.logAction('TOKEN_REFRESH', null, user.id, null,
                { email: user.email }, 'Refresco de token exitoso', req);

            return res.json({
                message: 'Token refrescado exitosamente',
                data: { tokens: newTokens }
            });
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: 'Token de refresco expirado' });
            }
            return this.handleError(error, 'refrescar token');
        }
    }

    // ... Resto de métodos (logout, resetPassword, etc.) se actualizarían
    // de manera similar, usando getUserRepository() ...

    generateTokens(user) {
        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                salt: crypto.randomBytes(16).toString('hex')
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            {
                id: user.id,
                salt: crypto.randomBytes(16).toString('hex')
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        return { accessToken, refreshToken };
    }

    validatePasswordComplexity(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!(password.length >= minLength &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumbers &&
            hasSpecialChar)) {
            throw new ValidationError(
                'La contraseña no cumple con los requisitos de seguridad'
            );
        }
    }

    async verifyRole(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userRepository = await this.getUserRepository();
            const user = await userRepository.findOne({
                where: { id: decoded.id, isActive: true }
            });

            if (!user) {
                throw new Error('Usuario no válido');
            }

            return {
                id: user.id,
                role: user.role,
                isValid: true
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    isTokenBlacklisted(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        return this.blacklistedTokens.has(tokenHash);
    }
}

module.exports = AuthController;