import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import createTablesIfNotExists from './utils/create_tables.js';
const app = express();
const port = 3000;
dotenv.config();
const db = new pg.Client({
    host : process.env.POSTGRES_HOST,
    user : process.env.POSTGRES_USER,
    database : process.env.POSTGRES_DATABASE,
    password : process.env.POSTGRES_PASSWORD,
    port : process.env.POSTGRES_PORT
});

try {
    db.connect();
    console.log("connected to the database");
} catch (err) {
    console.log("failed to connected to the database");
    console.log(err);
}

createTablesIfNotExists(db);

app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});