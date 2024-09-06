import express from 'express';
import pg from 'pg';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import createTablesIfNotExists from './utils/create_tables.js';
import { exit } from 'process';


const app = express();
const port = process.env.APP_PORT || 3000;
dotenv.config();
const db = new pg.Client({
    host : process.env.POSTGRES_HOST,
    user : process.env.POSTGRES_USER,
    database : process.env.POSTGRES_DATABASE,
    password : process.env.POSTGRES_PASSWORD,
    port : process.env.POSTGRES_PORT
});

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({ extended: true }));
// Creating the `public` folder as the static folder, allows our app to use the files in the `public` folder, like the JSS logo
app.use(express.static('public'))

try {
    db.connect();
    console.log("Connected to the database");
    createTablesIfNotExists(db);
} catch (err) {
    console.log("Failed to connect to the database");
    console.log(err);
    exit();
}

app.get('/',(req,res)=>{
    res.render('index.ejs');
})

app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});