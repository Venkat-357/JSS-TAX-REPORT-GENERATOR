import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const db = new pg.Client({
    host : process.env.POSTGRES_HOST,
    user : process.env.POSTGRES_USER,
    database : process.env.POSTGRES_DATABASE,
    password : process.env.POSTGRES_PASSWORD,
    port : process.env.POSTGRES_PORT
});

db.connect()
    .then(() => console.log("Connected to the database"))
    .catch(err => {
        console.error("Database connection error:", err.stack);
        process.exit(1); // Exit if the connection fails
    });

export default db;