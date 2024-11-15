// src/database/initialize.js
const { createConnection, getConnectionManager } = require('typeorm');
const dbConfig = require('../config/database');
const logger = require('../config/logger');

async function initializeDatabase() {
    try {
        // Verificar si ya existe una conexión
        const connectionManager = getConnectionManager();
        if (connectionManager.has('default')) {
            const connection = connectionManager.get('default');
            if (!connection.isConnected) {
                await connection.connect();
            }
            logger.info('Conexión existente recuperada correctamente');
            return connection;
        }

        // Si no existe, crear una nueva conexión
        const connection = await createConnection(dbConfig);
        logger.info('Base de datos inicializada correctamente');
        return connection;
    } catch (error) {
        logger.error('Error inicializando la base de datos:', error);
        throw error;
    }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
    initializeDatabase()
        .then(connection => {
            logger.info('Inicialización completada');
            // No cerrar la conexión si estamos en modo desarrollo
            if (process.env.NODE_ENV !== 'development') {
                connection.close();
            }
        })
        .catch(error => {
            logger.error('Error en la inicialización:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase;