// src/controllers/student.controller.js
const BaseController = require('./base.controller');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');
const cache = require('../config/cache');

class StudentController extends BaseController {
    constructor() {
        super('Student');
    }

    async findAll(currentUser, filters = {}) {
        try {
            if (!this.verifyPermission(currentUser.role, 'read')) {
                logger.warn(`Acceso denegado para el usuario ${currentUser.id} al intentar ver estudiantes`);
                throw new ForbiddenError('No autorizado para ver estudiantes');
            }

            const cacheKey = cache.generateKey('student_list', filters);
            let students = await cache.get(cacheKey);

            if (!students) {
                const repository = await this.getRepository();
                const query = this.buildQuery(filters);
                students = await repository.find({
                    ...query,
                    relations: ['interventions', 'assignedUsers']
                });

                await cache.set(cacheKey, students, 300);
            }

            logger.info(`Usuario ${currentUser.id} consultó la lista de estudiantes`);
            await this.logAction('VISUALIZAR', currentUser.id, null, null, null, 'Consulta de lista de estudiantes');

            return students;
        } catch (error) {
            logger.error(`Error en la consulta de estudiantes: ${error.message}`);
            throw this.handleError(error, 'consultar estudiantes');
        }
    }

    async findOne(currentUser, id) {
        try {
            if (!this.verifyPermission(currentUser.role, 'read')) {
                logger.warn(`Acceso denegado para el usuario ${currentUser.id} al intentar ver el estudiante ${id}`);
                throw new ForbiddenError('No autorizado para ver estudiantes');
            }

            const cacheKey = `student:${id}`;
            let student = await cache.get(cacheKey);

            if (!student) {
                const repository = await this.getRepository();
                student = await repository.findOne(id, {
                    relations: ['interventions', 'assignedUsers']
                });

                if (!student) {
                    logger.warn(`Usuario ${currentUser.id} intentó acceder a un estudiante inexistente con ID ${id}`);
                    throw new NotFoundError('Estudiante no encontrado');
                }

                await cache.set(cacheKey, student, 300);
            }

            logger.info(`Usuario ${currentUser.id} visualizó el estudiante ${id}`);
            await this.logAction('VISUALIZAR', currentUser.id, id);

            return student;
        } catch (error) {
            logger.error(`Error en la consulta del estudiante ${id}: ${error.message}`);
            throw this.handleError(error, 'consultar estudiante');
        }
    }

    async create(currentUser, studentData) {
        try {
            if (!this.verifyPermission(currentUser.role, 'create')) {
                logger.warn(`Acceso denegado para el usuario ${currentUser.id} al intentar crear un estudiante`);
                throw new ForbiddenError('No autorizado para crear estudiantes');
            }

            const repository = await this.getRepository();
            const existingStudent = await repository.findOne({
                where: [
                    { rut: studentData.rut },
                    { matriculaNumber: studentData.matriculaNumber }
                ]
            });

            if (existingStudent) {
                logger.warn(`Intento de creación de estudiante duplicado: RUT ${studentData.rut} o matrícula ${studentData.matriculaNumber}`);
                throw new Error('Estudiante ya existe');
            }

            const student = await repository.save({
                ...studentData,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            logger.info(`Usuario ${currentUser.id} creó el estudiante ${student.id}`);
            await this.logAction('CREAR', currentUser.id, student.id, null, student);
            await cache.invalidateCache('student_list:*');

            return student;
        } catch (error) {
            logger.error(`Error al crear el estudiante: ${error.message}`);
            throw this.handleError(error, 'crear estudiante');
        }
    }

    async update(currentUser, id, updateData) {
        try {
            if (!this.verifyPermission(currentUser.role, 'update')) {
                logger.warn(`Acceso denegado para el usuario ${currentUser.id} al intentar actualizar el estudiante ${id}`);
                throw new ForbiddenError('No autorizado para actualizar estudiantes');
            }

            const repository = await this.getRepository();
            const student = await repository.findOne(id);

            if (!student) {
                logger.warn(`Usuario ${currentUser.id} intentó actualizar un estudiante inexistente con ID ${id}`);
                throw new NotFoundError('Estudiante no encontrado');
            }

            const oldValues = { ...student };
            const updatedStudent = await repository.save({
                ...student,
                ...updateData,
                updatedAt: new Date()
            });

            logger.info(`Usuario ${currentUser.id} actualizó el estudiante ${id}`);
            await this.logAction('MODIFICAR', currentUser.id, id, oldValues, updatedStudent);
            await cache.delete(`student:${id}`);
            await cache.invalidateCache('student_list:*');

            return updatedStudent;
        } catch (error) {
            logger.error(`Error al actualizar el estudiante ${id}: ${error.message}`);
            throw this.handleError(error, 'actualizar estudiante');
        }
    }

    async delete(currentUser, id) {
        try {
            if (!this.verifyPermission(currentUser.role, 'delete')) {
                logger.warn(`Acceso denegado para el usuario ${currentUser.id} al intentar eliminar el estudiante ${id}`);
                throw new ForbiddenError('No autorizado para eliminar estudiantes');
            }

            const repository = await this.getRepository();
            const student = await repository.findOne(id);

            if (!student) {
                logger.warn(`Usuario ${currentUser.id} intentó eliminar un estudiante inexistente con ID ${id}`);
                throw new NotFoundError('Estudiante no encontrado');
            }

            await repository.softDelete(id);
            logger.info(`Usuario ${currentUser.id} eliminó el estudiante ${id}`);
            await this.logAction('ELIMINAR', currentUser.id, id, student);
            await cache.delete(`student:${id}`);
            await cache.invalidateCache('student_list:*');

            return { message: 'Estudiante eliminado correctamente' };
        } catch (error) {
            logger.error(`Error al eliminar el estudiante ${id}: ${error.message}`);
            throw this.handleError(error, 'eliminar estudiante');
        }
    }

    buildQuery(filters) {
        const query = {};
        if (filters.grade) query.where = { ...query.where, grade: filters.grade };
        if (filters.section) query.where = { ...query.where, section: filters.section };
        if (filters.enrollmentStatus) query.where = { ...query.where, enrollmentStatus: filters.enrollmentStatus };
        if (filters.isActive !== undefined) query.where = { ...query.where, isActive: filters.isActive };
        return query;
    }
}

module.exports = StudentController;