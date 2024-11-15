// src/controllers/intervention-comment.controller.js
const BaseController = require('./base.controller');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const cache = require('../config/cache');
const { getConnection } = require('typeorm');

class InterventionCommentController extends BaseController {
    constructor() {
        super('InterventionComment');
    }

    async findAll(currentUser, interventionId, filters = {}) {
        try {
            if (!this.verifyPermission(currentUser.role, 'read')) {
                throw new ForbiddenError('No autorizado para ver comentarios');
            }

            const cacheKey = cache.generateKey(`intervention_comments:${interventionId}`, filters);
            let comments = await cache.get(cacheKey);

            if (!comments) {
                const repository = await this.getRepository();
                const query = this.buildQuery(filters);
                query.where = { ...query.where, intervention: { id: interventionId } };

                comments = await repository.find({
                    ...query,
                    relations: ['user', 'intervention'],
                    order: { createdAt: 'DESC' }
                });

                await cache.set(cacheKey, comments, 300);
            }

            await this.logAction('VISUALIZAR', currentUser.id, null, null, null,
                `Consulta de comentarios de intervención ${interventionId}`);
            return comments;
        } catch (error) {
            throw this.handleError(error, 'consultar comentarios');
        }
    }

    async create(currentUser, interventionId, commentData) {
        try {
            if (!this.verifyPermission(currentUser.role, 'create')) {
                throw new ForbiddenError('No autorizado para crear comentarios');
            }

            const connection = getConnection();
            const interventionRepo = connection.getRepository('Intervention');
            const intervention = await interventionRepo.findOne(interventionId);

            if (!intervention) {
                throw new NotFoundError('Intervención no encontrada');
            }

            this.validateCommentType(commentData.tipo);

            const repository = await this.getRepository();
            const comment = await repository.save({
                ...commentData,
                intervention: { id: interventionId },
                user: { id: currentUser.id },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await this.logAction('CREAR', currentUser.id, comment.id, null, comment);
            await cache.deletePattern(`intervention_comments:${interventionId}*`);
            await cache.delete(`intervention:${interventionId}`);

            return comment;
        } catch (error) {
            throw this.handleError(error, 'crear comentario');
        }
    }

    async update(currentUser, commentId, updateData) {
        try {
            const repository = await this.getRepository();
            const comment = await repository.findOne(commentId, {
                relations: ['user', 'intervention']
            });

            if (!comment) {
                throw new NotFoundError('Comentario no encontrado');
            }

            if (!this.canModifyComment(currentUser, comment)) {
                throw new ForbiddenError('No autorizado para modificar este comentario');
            }

            if (updateData.tipo) {
                this.validateCommentType(updateData.tipo);
            }

            const oldValues = { ...comment };
            const updatedComment = await repository.save({
                ...comment,
                ...updateData,
                updatedAt: new Date()
            });

            await this.logAction('MODIFICAR', currentUser.id, commentId, oldValues, updatedComment);
            await cache.deletePattern(`intervention_comments:${comment.intervention.id}*`);
            await cache.delete(`intervention:${comment.intervention.id}`);

            return updatedComment;
        } catch (error) {
            throw this.handleError(error, 'actualizar comentario');
        }
    }

    async delete(currentUser, commentId) {
        try {
            const repository = await this.getRepository();
            const comment = await repository.findOne(commentId, {
                relations: ['user', 'intervention']
            });

            if (!comment) {
                throw new NotFoundError('Comentario no encontrado');
            }

            if (!this.canDeleteComment(currentUser, comment)) {
                throw new ForbiddenError('No autorizado para eliminar este comentario');
            }

            await repository.remove(comment);
            await this.logAction('ELIMINAR', currentUser.id, commentId, comment);
            await cache.deletePattern(`intervention_comments:${comment.intervention.id}*`);
            await cache.delete(`intervention:${comment.intervention.id}`);

            return { message: 'Comentario eliminado correctamente' };
        } catch (error) {
            throw this.handleError(error, 'eliminar comentario');
        }
    }

    validateCommentType(tipo) {
        const validTypes = [
            'Seguimiento', 'Entrevista', 'Acuerdo', 'Observación',
            'Derivación', 'Contacto Apoderado', 'Reunión Equipo', 'Otro'
        ];

        if (!validTypes.includes(tipo)) {
            throw new Error('Tipo de comentario no válido');
        }
    }

    canModifyComment(currentUser, comment) {
        return currentUser.role === 'Admin' ||
            (comment.user.id === currentUser.id &&
                ['Admin', 'User', 'Viewer'].includes(currentUser.role));
    }

    canDeleteComment(currentUser, comment) {
        return currentUser.role === 'Admin' ||
            (comment.user.id === currentUser.id && currentUser.role === 'Admin');
    }

    buildQuery(filters) {
        const query = {};
        if (filters.tipo) query.where = { ...query.where, tipo: filters.tipo };
        if (filters.isPrivate !== undefined) query.where = { ...query.where, isPrivate: filters.isPrivate };
        if (filters.userId) query.where = { ...query.where, user: { id: filters.userId } };
        return query;
    }
}

module.exports = InterventionCommentController;