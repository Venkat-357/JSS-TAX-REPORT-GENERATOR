import express from 'express';
import pg from 'pg';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
dotenv.config(); // Load the environment variables from the .env file
import createTablesIfNotExists from './utils/create_tables.js';
import { exit } from 'process';


// Basic Express app setup
const app = express();
const port = process.env.APP_PORT || 3000;
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
app.use(
    session({
        secret: process.env.APP_SECRET,
        resave: false,
        saveUninitialized: false
    })
);

try {
    db.connect();
    console.log("Connected to the database");
    // Create the tables if they do not exist
    createTablesIfNotExists(db);
} catch (err) {
    console.log("Failed to connect to the database");
    console.log(err);
    // Exit the application if the database connection fails
    exit();
}

app.get('/',(req,res)=>{
    res.render('index.ejs');
})

// Login methods - The same form is used for both admins and division users
// The login endpoint will automatically log in the user based on the type of user
app.get("/login", (req,res)=>{
    if (req.session.isLoggedIn) {
        res.redirect("/home");
    } else {
        res.render("login.ejs");
    }
});
import { login, logout } from './controllers/auth.js';
app.post("/login", async (req,res)=> login(req,res,db));

app.get("/logout", async(req,res)=> logout(req,res));

// Main page - Will route to a different view based on the type of user
app.get("/home", async(req,res) => {
    if (!req.session.isLoggedIn) {
        res.redirect("/login");
        return;
    }
    // Redirect to the correct page based on the type of user
    if (req.session.isAdmin) {
        res.redirect("/admin");
    } else if (req.session.isDivisionUser) {
        res.redirect("/division");
    } else if (req.session.isInstitutionUser) {
        res.redirect("/institution");
    } else if (req.session.isSiteUser) {
        res.redirect("/site");
    } else {
        res.send("Was not able to redirect to the correct page");
    }
});

// Admin page
app.get("/admin", async(req,res) => {
    if (!req.session.isLoggedIn || !req.session.isAdmin) {
        res.redirect("/login");
        return;
    }
    res.render("admin.ejs");
});

// Division page
app.get("/division", async(req,res) => {
    if (!req.session.isLoggedIn || !req.session.isDivisionUser) {
        res.redirect("/login");
        return;
    }
    res.render("division.ejs");
});

// Institution page
app.get("/institution", async(req,res) => {
    if (!req.session.isLoggedIn || !req.session.isInstitutionUser) {
        res.redirect("/login");
        return;
    }
    res.render("institution.ejs");
});

// Site page
app.get("/site", async(req,res) => {
    if (!req.session.isLoggedIn || !req.session.isSiteUser) {
        res.redirect("/login");
        return;
    }
    res.render("site.ejs");
});

app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});