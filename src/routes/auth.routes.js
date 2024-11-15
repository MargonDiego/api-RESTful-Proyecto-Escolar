// src/routes/auth.routes.js
const express = require('express');
const AuthController = require('../controllers/auth.controller'); // Importar la clase
const { checkRole } = require('../middleware/permission.middleware');
const { validateLogin, validatePasswordReset } = require('../middleware/validators');

const router = express.Router();
const authController = new AuthController(); // Crear instancia explícita

// Ruta para iniciar sesión
router.post(
    '/login',
    validateLogin,
    async (req, res) => {
        try {
            await authController.login(req, res);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

// Ruta para refrescar el token
router.post(
    '/refresh-token',
    async (req, res) => {
        try {
            await authController.refreshToken(req, res);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

// Ruta para cerrar sesión
router.post(
    '/logout',
    async (req, res) => {
        try {
            await authController.logout(req, res);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

// Ruta para resetear la contraseña
router.post(
    '/reset-password/:userId',
    checkRole(['Admin']),
    validatePasswordReset,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { password } = req.body;
            const result = await authController.resetPassword(req.user, userId, password);
            res.status(200).json(result);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

module.exports = router;
