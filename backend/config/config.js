// backend/config/config.js
require('dotenv').config(); // if you want to load DB creds from .env

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'your_password',
    database: process.env.DB_NAME || 'your_db_name',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log, // or false to disable SQL logs
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'your_password',
    database: process.env.DB_NAME || 'your_db_name_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
  },
};
