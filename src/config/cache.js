// src/config/cache.js
const Redis = require('ioredis');
const logger = require('./logger');

class CacheManager {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.defaultTTL = 3600; // 1 hora en segundos

        this.redis.on('error', (error) => {
            logger.error('Error en conexión Redis:', error);
        });

        this.redis.on('connect', () => {
            logger.info('Conexión Redis establecida');
        });
    }

    // Generar una clave única basada en parámetros
    generateKey(prefix, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');
        return `${prefix}:${sortedParams}`;
    }

    // Obtener datos del caché
    async get(key) {
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error(`Error al obtener caché para ${key}:`, error);
            return null;
        }
    }

    // Guardar datos en caché
    async set(key, data, ttl = this.defaultTTL) {
        try {
            await this.redis.set(
                key,
                JSON.stringify(data),
                'EX',
                ttl
            );
            return true;
        } catch (error) {
            logger.error(`Error al guardar caché para ${key}:`, error);
            return false;
        }
    }

    // Eliminar una clave específica
    async delete(key) {
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            logger.error(`Error al eliminar caché para ${key}:`, error);
            return false;
        }
    }

    // Eliminar todas las claves que coincidan con un patrón
    async deletePattern(pattern) {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            return true;
        } catch (error) {
            logger.error(`Error al eliminar caché con patrón ${pattern}:`, error);
            return false;
        }
    }

    // Middleware para cachear respuestas de API
    cacheMiddleware(prefix, ttl = null) {
        return async (req, res, next) => {
            if (req.method !== 'GET') {
                return next();
            }

            const cacheKey = this.generateKey(prefix, {
                query: req.query,
                params: req.params,
                user: req.user?.id
            });

            try {
                const cachedData = await this.get(cacheKey);
                if (cachedData) {
                    return res.json(cachedData);
                }

                // Interceptar la respuesta para guardar en caché
                const originalJson = res.json;
                res.json = async (data) => {
                    await this.set(cacheKey, data, ttl || this.defaultTTL);
                    res.json = originalJson;
                    return res.json(data);
                };

                next();
            } catch (error) {
                logger.error('Error en middleware de caché:', error);
                next();
            }
        };
    }

    // Invalidar caché después de mutaciones
    async invalidateCache(patterns) {
        try {
            if (Array.isArray(patterns)) {
                await Promise.all(
                    patterns.map(pattern => this.deletePattern(pattern))
                );
            } else {
                await this.deletePattern(patterns);
            }
        } catch (error) {
            logger.error('Error al invalidar caché:', error);
        }
    }
}

module.exports = new CacheManager();