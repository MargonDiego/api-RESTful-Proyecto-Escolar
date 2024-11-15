// src/server.js
require('dotenv').config();
require('reflect-metadata');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const initializeDatabase = require('./database/initialize');

// Importación de todas las rutas centralizadas
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./utils/errors');

const app = express();

// Middleware de seguridad y registro de solicitudes
app.use(cors());
app.use(helmet());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json());

// Variable global para la conexión
let connection = null;

// Ruta de verificación de estado del servidor
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date(),
        dbConnection: connection?.isConnected ? 'Connected' : 'Disconnected'
    });
});

// Integración de rutas de la API
app.use('/api', routes);

// Middleware para manejar rutas no encontradas
app.use(notFoundHandler);

// Middleware para manejo de errores
app.use(errorHandler);

// Conexión a la base de datos y inicio del servidor
const PORT = process.env.PORT || 4000;

const startServer = async () => {
    try {
        connection = await initializeDatabase();

        app.listen(PORT, () => {
            logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
        });
    } catch (error) {
        logger.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Solo iniciar el servidor si este archivo es ejecutado directamente
if (require.main === module) {
    startServer();
}

// Exportar para pruebas
module.exports = { app, connection };