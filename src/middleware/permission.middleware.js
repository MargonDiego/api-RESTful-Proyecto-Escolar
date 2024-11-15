// src/middleware/permissions.middleware.js
const { ForbiddenError } = require('../utils/errors');

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No autorizado para esta operación' });
        }

        next();
    };
};

const checkPermission = (entity, operation) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const role = req.user.role;
        let isAllowed = false;

        switch (role) {
            case 'Admin':
                isAllowed = true;
                break;
            case 'User':
                isAllowed = operation !== 'delete';
                break;
            case 'Viewer':
                switch (entity) {
                    case 'student':
                        isAllowed = operation === 'read';
                        break;
                    case 'intervention':
                        isAllowed = ['read', 'create', 'update'].includes(operation);
                        break;
                    case 'comment':
                        isAllowed = ['read', 'create', 'update'].includes(operation);
                        break;
                    default:
                        isAllowed = false;
                }
                break;
            default:
                isAllowed = false;
        }

        if (!isAllowed) {
            return res.status(403).json({
                error: 'No autorizado',
                message: 'No tiene permisos suficientes para esta operación'
            });
        }

        next();
    };
};

module.exports = { checkRole, checkPermission };