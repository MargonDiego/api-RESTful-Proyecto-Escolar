// src/controllers/base.controller.js
const { getConnection } = require('typeorm');
const logger = require('../config/logger');
const cache = require('../config/cache');

class BaseController {
    constructor(entity) {
        this.entity = entity;
    }

    async getRepository() {
        try {
            const connection = getConnection();
            return connection.getRepository(this.entity);
        } catch (error) {
            logger.error(`Error getting repository for ${this.entity}: ${error.message}`);
            throw error;
        }
    }

    verifyPermission(userRole, operation) {
        switch (userRole) {
            case 'Admin':
                return true;
            case 'User':
                return operation !== 'delete';
            case 'Viewer':
                switch (this.entity) {
                    case 'Student':
                        return operation === 'read';
                    case 'Intervention':
                    case 'InterventionComment':
                        return ['read', 'create', 'update'].includes(operation);
                    default:
                        return false;
                }
            default:
                return false;
        }
    }

    async logAction(action, userId, entityId, oldValues = null, newValues = null, details = null, req) {
        try {
            const connection = getConnection();
            const auditRepo = connection.getRepository('Audit');
            await auditRepo.save({
                entityName: this.entity,
                entityId,
                action,
                userId,
                oldValues,
                newValues,
                details,
                ipAddress: req?.ip,
                userAgent: req?.get('user-agent'),
                module: this.getModuleByEntity()
            });
        } catch (error) {
            logger.error(`Error logging action: ${error.message}`);
        }
    }

    getModuleByEntity() {
        const moduleMap = {
            'Student': 'ESTUDIANTES',
            'Intervention': 'INTERVENCIONES',
            'User': 'USUARIOS',
            'InterventionComment': 'INTERVENCIONES'
        };
        return moduleMap[this.entity] || 'SISTEMA';
    }

    handleError(error, operation) {
        logger.error(`Error en operación ${operation}: ${error.message}`);
        if (error.name === 'EntityNotFoundError') {
            return new NotFoundError('Recurso no encontrado');
        }
        if (error.name === 'QueryFailedError') {
            return {
                status: 400,
                error: 'Error en la consulta',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            };
        }
        return {
            status: 500,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        };
    }

    async findAll(filters = {}) {
        try {
            const repository = await this.getRepository();
            const cacheKey = cache.generateKey(`${this.entity}_list`, filters);
            let data = await cache.get(cacheKey);

            if (!data) {
                data = await repository.find(filters);
                await cache.set(cacheKey, data, 300);
            }

            return this.buildResponse(data);
        } catch (error) {
            throw this.handleError(error, 'findAll');
        }
    }

    async findOne(id) {
        try {
            const repository = await this.getRepository();
            const cacheKey = `${this.entity}:${id}`;
            let data = await cache.get(cacheKey);

            if (!data) {
                data = await repository.findOne(id);
                if (!data) {
                    throw new NotFoundError(`${this.entity} no encontrado`);
                }
                await cache.set(cacheKey, data, 300);
            }

            return data;
        } catch (error) {
            throw this.handleError(error, 'findOne');
        }
    }

    async create(data) {
        try {
            const repository = await this.getRepository();
            const newData = await repository.save(data);
            await cache.invalidateCache(`${this.entity}_list:*`);
            return newData;
        } catch (error) {
            throw this.handleError(error, 'create');
        }
    }

    async update(id, data) {
        try {
            const repository = await this.getRepository();
            const entity = await this.findOne(id);
            const updatedData = await repository.save({ ...entity, ...data });

            const cacheKey = `${this.entity}:${id}`;
            await cache.delete(cacheKey);
            await cache.invalidateCache(`${this.entity}_list:*`);

            return updatedData;
        } catch (error) {
            throw this.handleError(error, 'update');
        }
    }

    async delete(id) {
        try {
            const repository = await this.getRepository();
            const entity = await this.findOne(id);
            await repository.remove(entity);

            const cacheKey = `${this.entity}:${id}`;
            await cache.delete(cacheKey);
            await cache.invalidateCache(`${this.entity}_list:*`);

            return { success: true, message: `${this.entity} eliminado correctamente` };
        } catch (error) {
            throw this.handleError(error, 'delete');
        }
    }

    buildPaginationQuery(req) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const order = req.query.order ? JSON.parse(req.query.order) : {};

        return { page, limit, skip, order };
    }

    buildResponse(data, page = null, limit = null, total = null) {
        const response = { data };
        if (page !== null) {
            response.pagination = {
                totalItems: total,
                currentPage: page,
                pageSize: limit,
                totalPages: Math.ceil(total / limit)
            };
        }
        return response;
    }
}

module.exports = BaseController;