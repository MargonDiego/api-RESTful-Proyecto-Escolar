// src/config/database.js
const path = require('path');
require('dotenv').config();

const config = {
    type: "sqlite",
    database: path.join(process.cwd(), 'database.sqlite'),
    synchronize: process.env.NODE_ENV === "development",
    logging: process.env.NODE_ENV === "development",
    entities: [path.join(__dirname, '..', 'entities', '*.js')],
    migrations: [path.join(__dirname, '..', 'database', 'migrations', '*.js')],
    subscribers: [path.join(__dirname, '..', 'subscribers', '*.js')],
    cli: {
        entitiesDir: "src/entities",
        migrationsDir: "src/database/migrations",
        subscribersDir: "src/subscribers"
    }
};

module.exports = config;