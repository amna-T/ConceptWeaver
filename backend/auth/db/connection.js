const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'postgres-db',
    database: process.env.DB_NAME || 'conceptweaver',
    port: process.env.DB_PORT || 5432,
});
pool.on('connect', () =>{
    console.log('Connected to the database');
});

module.exports = pool;