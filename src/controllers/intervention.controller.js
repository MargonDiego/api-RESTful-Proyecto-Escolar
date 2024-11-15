// src/controllers/intervention.controller.js
const BaseController = require('./base.controller');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const cache = require('../config/cache');

class InterventionController extends BaseController {
    constructor() {
        super('Intervention');
    }

    async findAll(currentUser, filters = {}) {
        try {
            if (!this.verifyPermission(currentUser.role, 'read')) {
                throw new ForbiddenError('No autorizado para ver intervenciones');
            }

            const cacheKey = cache.generateKey('intervention_list', filters);
            let interventions = await cache.get(cacheKey);

            if (!interventions) {
                const repository = await this.getRepository();
                const query = this.buildQuery(filters);
                interventions = await repository.find({
                    ...query,
                    relations: ['student', 'informer', 'responsible', 'comments'],
                    order: { dateReported: 'DESC' }
                });

                await cache.set(cacheKey, interventions, 300);
            }

            await this.logAction('VISUALIZAR', currentUser.id, null, null, null,
                'Consulta de lista de intervenciones');
            return interventions;
        } catch (error) {
            throw this.handleError(error, 'consultar intervenciones');
        }
    }

    async findOne(currentUser, id) {
        try {
            if (!this.verifyPermission(currentUser.role, 'read')) {
                throw new ForbiddenError('No autorizado para ver intervenciones');
            }

            const cacheKey = `intervention:${id}`;
            let intervention = await cache.get(cacheKey);

            if (!intervention) {
                const repository = await this.getRepository();
                intervention = await repository.findOne(id, {
                    relations: ['student', 'informer', 'responsible', 'comments', 'comments.user']
                });

                if (!intervention) {
                    throw new NotFoundError('Intervención no encontrada');
                }

                await cache.set(cacheKey, intervention, 300);
            }

            await this.logAction('VISUALIZAR', currentUser.id, id);
            return intervention;
        } catch (error) {
            throw this.handleError(error, 'consultar intervención');
        }
    }

    async create(currentUser, interventionData) {
        try {
            if (!this.verifyPermission(currentUser.role, 'create')) {
                throw new ForbiddenError('No autorizado para crear intervenciones');
            }

            this.validateInterventionData(interventionData);
            const repository = await this.getRepository();

            const intervention = await repository.save({
                ...interventionData,
                informer: { id: currentUser.id },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await this.logAction('CREAR', currentUser.id, intervention.id, null, intervention);
            await cache.invalidateCache('intervention_list:*');

            return intervention;
        } catch (error) {
            throw this.handleError(error, 'crear intervención');
        }
    }

    async update(currentUser, id, updateData) {
        try {
            if (!this.verifyPermission(currentUser.role, 'update')) {
                throw new ForbiddenError('No autorizado para actualizar intervenciones');
            }

            const repository = await this.getRepository();
            const intervention = await repository.findOne(id);

            if (!intervention) {
                throw new NotFoundError('Intervención no encontrada');
            }

            this.validateInterventionData(updateData);

            const oldValues = { ...intervention };
            const updatedIntervention = await repository.save({
                ...intervention,
                ...updateData,
                updatedAt: new Date()
            });

            await this.logAction('MODIFICAR', currentUser.id, id, oldValues, updatedIntervention);
            await cache.delete(`intervention:${id}`);
            await cache.invalidateCache('intervention_list:*');

            return updatedIntervention;
        } catch (error) {
            throw this.handleError(error, 'actualizar intervención');
        }
    }

    async delete(currentUser, id) {
        try {
            if (!this.verifyPermission(currentUser.role, 'delete')) {
                throw new ForbiddenError('No autorizado para eliminar intervenciones');
            }

            const repository = await this.getRepository();
            const intervention = await repository.findOne(id);

            if (!intervention) {
                throw new NotFoundError('Intervención no encontrada');
            }

            await repository.softDelete(id);
            await this.logAction('ELIMINAR', currentUser.id, id, intervention);
            await cache.delete(`intervention:${id}`);
            await cache.invalidateCache('intervention_list:*');

            return { message: 'Intervención eliminada correctamente' };
        } catch (error) {
            throw this.handleError(error, 'eliminar intervención');
        }
    }

    validateInterventionData(data) {
        const validTypes = [
            'Académica', 'Conductual', 'Emocional', 'Social',
            'Familiar', 'Asistencia', 'Derivación', 'PIE',
            'Convivencia Escolar', 'Orientación', 'Otro'
        ];

        const validStatus = [
            'Pendiente', 'En Proceso', 'En Espera',
            'Finalizada', 'Derivada', 'Cancelada'
        ];

        if (data.type && !validTypes.includes(data.type)) {
            throw new Error('Tipo de intervención no válido');
        }

        if (data.status && !validStatus.includes(data.status)) {
            throw new Error('Estado de intervención no válido');
        }

        if (data.dateResolved && new Date(data.dateResolved) < new Date(data.dateReported)) {
            throw new Error('La fecha de resolución no puede ser anterior a la fecha de reporte');
        }
    }

    buildQuery(filters) {
        const query = {};
        if (filters.type) query.where = { ...query.where, type: filters.type };
        if (filters.status) query.where = { ...query.where, status: filters.status };
        if (filters.priority) query.where = { ...query.where, priority: filters.priority };
        if (filters.studentId) query.where = { ...query.where, student: { id: filters.studentId } };
        if (filters.responsibleId) query.where = { ...query.where, responsible: { id: filters.responsibleId } };
        return query;
    }
}

module.exports = InterventionController;