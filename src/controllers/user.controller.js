// src/controllers/user.controller.js
const BaseController = require('./base.controller');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const bcrypt = require('bcryptjs');
const { Not } = require('typeorm');
const cache = require('../config/cache');

class UserController extends BaseController {
    constructor() {
        super('User');
    }

    async findAll(currentUser, filters = {}) {
        try {
            if (!['Admin', 'User'].includes(currentUser.role)) {
                throw new ForbiddenError('No autorizado para ver usuarios');
            }

            const cacheKey = cache.generateKey('user_list', filters);
            let users = await cache.get(cacheKey);

            if (!users) {
                const repository = await this.getRepository();
                const query = this.buildQuery(filters);
                users = await repository.find({
                    ...query,
                    select: [
                        'id', 'firstName', 'lastName', 'email', 'rut',
                        'role', 'staffType', 'department', 'position',
                        'isActive', 'lastLogin'
                    ]
                });

                await cache.set(cacheKey, users, 300); // Cachear por 5 minutos
            }

            await this.logAction('VISUALIZAR', currentUser.id, null, null, null, 'Consulta de lista de usuarios');
            return users;
        } catch (error) {
            throw this.handleError(error, 'consultar usuarios');
        }
    }

    async findOne(currentUser, id) {
        try {
            if (!['Admin', 'User'].includes(currentUser.role)) {
                throw new ForbiddenError('No autorizado para ver detalles de usuario');
            }

            const cacheKey = `user:${id}`;
            let user = await cache.get(cacheKey);

            if (!user) {
                const repository = await this.getRepository();
                user = await repository.findOne(id, {
                    select: [
                        'id', 'firstName', 'lastName', 'email', 'rut',
                        'role', 'staffType', 'department', 'position',
                        'phoneNumber', 'birthDate', 'address', 'isActive',
                        'createdAt', 'updatedAt'
                    ]
                });

                if (!user) {
                    throw new NotFoundError('Usuario no encontrado');
                }

                await cache.set(cacheKey, user, 300); // Cachear por 5 minutos
            }

            await this.logAction('VISUALIZAR', currentUser.id, id);
            return user;
        } catch (error) {
            throw this.handleError(error, 'consultar usuario');
        }
    }

    async create(currentUser, userData) {
        try {
            if (currentUser.role !== 'Admin') {
                throw new ForbiddenError('No autorizado para crear usuarios');
            }

            this.validateUserData(userData);
            const repository = await this.getRepository();

            const existingUser = await repository.findOne({
                where: [
                    { email: userData.email },
                    { rut: userData.rut }
                ]
            });

            if (existingUser) {
                throw new Error('Usuario ya existe (email o RUT duplicado)');
            }

            if (userData.password) {
                userData.password = await bcrypt.hash(userData.password, 10);
            }

            const user = await repository.save({
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await this.logAction('CREAR', currentUser.id, user.id, null, user);
            await cache.invalidateCache('user_list:*');
            return user;
        } catch (error) {
            throw this.handleError(error, 'crear usuario');
        }
    }

    async update(currentUser, id, updateData) {
        try {
            if (!['Admin', 'User'].includes(currentUser.role)) {
                throw new ForbiddenError('No autorizado para actualizar usuarios');
            }

            const repository = await this.getRepository();
            const user = await repository.findOne(id);

            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            if (currentUser.role === 'User' && currentUser.id !== id) {
                throw new ForbiddenError('Solo puede modificar su propio perfil');
            }

            this.validateUserData(updateData);

            if (updateData.email || updateData.rut) {
                const existingUser = await repository.findOne({
                    where: [
                        { email: updateData.email, id: Not(id) },
                        { rut: updateData.rut, id: Not(id) }
                    ]
                });

                if (existingUser) {
                    throw new Error('Email o RUT ya registrado por otro usuario');
                }
            }

            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10);
            }

            const oldValues = { ...user };
            const updatedUser = await repository.save({
                ...user,
                ...updateData,
                updatedAt: new Date()
            });

            await this.logAction('MODIFICAR', currentUser.id, id, oldValues, updatedUser);
            await cache.delete(`user:${id}`);
            await cache.invalidateCache('user_list:*');

            return updatedUser;
        } catch (error) {
            throw this.handleError(error, 'actualizar usuario');
        }
    }

    async delete(currentUser, id) {
        try {
            if (currentUser.role !== 'Admin') {
                throw new ForbiddenError('No autorizado para eliminar usuarios');
            }

            const repository = await this.getRepository();
            const user = await repository.findOne(id);

            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            if (user.role === 'Admin') {
                const adminCount = await repository.count({
                    where: { role: 'Admin', isActive: true }
                });
                if (adminCount <= 1) {
                    throw new Error('No se puede eliminar el último administrador');
                }
            }

            await repository.update(id, { isActive: false, deletedAt: new Date() });
            await this.logAction('ELIMINAR', currentUser.id, id, user);
            await cache.delete(`user:${id}`);
            await cache.invalidateCache('user_list:*');

            return { message: 'Usuario eliminado correctamente' };
        } catch (error) {
            throw this.handleError(error, 'eliminar usuario');
        }
    }

    async updateProfile(currentUser, updateData) {
        try {
            const repository = await this.getRepository();
            const user = await repository.findOne(currentUser.id);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            const allowedUpdates = {
                phoneNumber: updateData.phoneNumber,
                address: updateData.address,
                emergencyContact: updateData.emergencyContact,
                configuracionNotificaciones: updateData.configuracionNotificaciones
            };

            const oldValues = { ...user };
            const updatedUser = await repository.save({
                ...user,
                ...allowedUpdates,
                updatedAt: new Date()
            });

            await this.logAction('MODIFICAR_PERFIL', currentUser.id, user.id, oldValues, allowedUpdates);
            return updatedUser;
        } catch (error) {
            throw this.handleError(error, 'actualizar perfil');
        }
    }

    async changeUserStatus(currentUser, userId, isActive) {
        try {
            if (currentUser.role !== 'Admin') {
                throw new ForbiddenError('No autorizado para cambiar estado de usuarios');
            }

            const repository = await this.getRepository();
            const user = await repository.findOne(userId);

            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            if (!isActive && user.role === 'Admin') {
                const activeAdmins = await repository.count({
                    where: { role: 'Admin', isActive: true }
                });
                if (activeAdmins <= 1) {
                    throw new Error('No se puede desactivar el último administrador');
                }
            }

            const oldValues = { ...user };
            await repository.update(userId, { isActive, updatedAt: new Date() });

            await this.logAction(isActive ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO', currentUser.id, userId, oldValues, { isActive });
            await cache.delete(`user:${userId}`);
            await cache.invalidateCache('user_list:*');

            return { message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente` };
        } catch (error) {
            throw this.handleError(error, 'cambiar estado de usuario');
        }
    }

    async assignRoles(currentUser, userId, roles) {
        try {
            if (currentUser.role !== 'Admin') {
                throw new ForbiddenError('No autorizado para asignar roles');
            }

            const repository = await this.getRepository();
            const user = await repository.findOne(userId);

            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            if (!Array.isArray(roles) || !roles.every(role => ['Admin', 'User', 'Viewer'].includes(role))) {
                throw new Error('Roles inválidos');
            }

            const oldValues = { ...user };
            await repository.update(userId, { roles, updatedAt: new Date() });

            await this.logAction('ASIGNAR_ROLES', currentUser.id, userId, oldValues, { roles });
            await cache.delete(`user:${userId}`);
            await cache.invalidateCache('user_list:*');

            return { message: 'Roles asignados correctamente' };
        } catch (error) {
            throw this.handleError(error, 'asignar roles');
        }
    }

    validateUserData(data) {
        const validRoles = ['Admin', 'User', 'Viewer'];
        const validStaffTypes = ['Directivo', 'Docente', 'Profesional PIE',
            'Asistente de la Educación', 'Administrativo'];
        const validDepartments = ['Dirección', 'UTP', 'Convivencia Escolar',
            'Orientación', 'PIE', 'Departamento Lenguaje', 'Departamento Matemática',
            'Departamento Ciencias', 'Departamento Historia', 'Departamento Inglés',
            'Departamento Arte y Música', 'Departamento Ed. Física',
            'Inspectoría', 'Administración'];

        if (data.role && !validRoles.includes(data.role)) {
            throw new Error('Rol no válido');
        }

        if (data.staffType && !validStaffTypes.includes(data.staffType)) {
            throw new Error('Tipo de personal no válido');
        }

        if (data.department && !validDepartments.includes(data.department)) {
            throw new Error('Departamento no válido');
        }
    }

    buildQuery(filters) {
        const query = {};
        if (filters.role) query.where = { ...query.where, role: filters.role };
        if (filters.staffType) query.where = { ...query.where, staffType: filters.staffType };
        if (filters.department) query.where = { ...query.where, department: filters.department };
        if (filters.isActive !== undefined) query.where = { ...query.where, isActive: filters.isActive };
        if (filters.region) query.where = { ...query.where, region: filters.region };
        return query;
    }
}

module.exports = UserController;