import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const db = new pg.Pool({
    pool_mode: process.env.POOL_MODE,
    host : process.env.POSTGRES_HOST,
    user : process.env.POSTGRES_USER,
    database : process.env.POSTGRES_DATABASE,
    password : process.env.POSTGRES_PASSWORD,
    port : process.env.POSTGRES_PORT,
    idleTimeoutMillis: 30000, // Auto-close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Fail fast on connection timeout
});

db.connect()
    .then(() => console.log("Connected to the database"))
    .catch(err => {
        console.error("Database connection error:", err.stack);
        process.exit(1); // Exit if the connection fails
    });

export default db;