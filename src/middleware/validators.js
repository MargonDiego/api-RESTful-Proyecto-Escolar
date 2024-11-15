// src/middleware/validators.js
const { body, param, query } = require('express-validator');

const validateLogin = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
];

const validatePasswordReset = [
    body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/).withMessage('Debe contener una mayúscula')
        .matches(/[a-z]/).withMessage('Debe contener una minúscula')
        .matches(/[0-9]/).withMessage('Debe contener un número')
        .matches(/[!@#$%^&*]/).withMessage('Debe contener un carácter especial')
];

const validateUser = [
    body('email').isEmail().withMessage('Email inválido'),
    body('firstName').notEmpty().withMessage('Nombre requerido'),
    body('lastName').notEmpty().withMessage('Apellido requerido'),
    body('role').isIn(['Admin', 'User', 'Viewer']).withMessage('Rol inválido'),
    body('rut').matches(/^\d{1,2}\.\d{3}\.\d{3}[-][0-9kK]{1}$/)
        .withMessage('RUT inválido')
];

const validateStudent = [
    body('firstName').notEmpty().withMessage('Nombre requerido'),
    body('lastName').notEmpty().withMessage('Apellido requerido'),
    body('rut').matches(/^\d{1,2}\.\d{3}\.\d{3}[-][0-9kK]{1}$/)
        .withMessage('RUT inválido'),
    body('grade').isIn([
        'Pre-Kinder', 'Kinder',
        '1° Básico', '2° Básico', '3° Básico', '4° Básico',
        '5° Básico', '6° Básico', '7° Básico', '8° Básico',
        '1° Medio', '2° Medio', '3° Medio', '4° Medio'
    ]).withMessage('Nivel educativo inválido'),
    body('matriculaNumber').notEmpty().withMessage('Número de matrícula requerido')
];

const validateAuditQuery = [
    query('entityName').optional().isString().withMessage('Entidad inválida'),
    query('action').optional().isIn(['CREAR', 'MODIFICAR', 'ELIMINAR', 'VISUALIZAR', 'DESCARGAR']).withMessage('Acción inválida'),
    query('userId').optional().isInt().withMessage('ID de usuario inválido'),
    query('module').optional().isIn(['ESTUDIANTES', 'INTERVENCIONES', 'USUARIOS', 'DOCUMENTOS', 'SISTEMA']).withMessage('Módulo inválido'),
    query('dateFrom').optional().isISO8601().withMessage('Fecha desde inválida'),
    query('dateTo').optional().isISO8601().withMessage('Fecha hasta inválida'),
    query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Límite inválido')
];

const validateIntervention = [
    body('title').notEmpty().withMessage('Título requerido'),
    body('description').notEmpty().withMessage('Descripción requerida'),
    body('type').isIn([
        'Académica', 'Conductual', 'Emocional', 'Social',
        'Familiar', 'Asistencia', 'Derivación', 'PIE',
        'Convivencia Escolar', 'Orientación', 'Otro'
    ]).withMessage('Tipo de intervención inválido'),
    body('priority').isIn(['Baja', 'Media', 'Alta', 'Urgente'])
        .withMessage('Prioridad inválida'),
    body('studentId').isInt().withMessage('ID de estudiante inválido')
];

const validateComment = [
    body('content').notEmpty().withMessage('Contenido requerido'),
    body('tipo').isIn([
        'Seguimiento', 'Entrevista', 'Acuerdo', 'Observación',
        'Derivación', 'Contacto Apoderado', 'Reunión Equipo', 'Otro'
    ]).withMessage('Tipo de comentario inválido')
];

module.exports = {
    validateLogin,
    validatePasswordReset,
    validateUser,
    validateStudent,
    validateIntervention,
    validateComment,
    validateAuditQuery
};