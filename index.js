// General imports
import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import morgan from 'morgan';
import flash from 'connect-flash';
import dotenv from 'dotenv';
dotenv.config(); // Load the environment variables from the .env file
import { exit } from 'process';

// Our custom imports
import db from './db.js';
import createTablesIfNotExists from './utils/create_tables.js';

// Custom middleware imports
import { setAuthStatus } from './middleware/auth_wrap.js';
import { setFlashMessages } from './middleware/set_flash_messages.js';
import { allowLoggedIn } from './middleware/restrict_routes.js';

// Basic Express app setup
const app = express();
const port = process.env.APP_PORT || 3000;
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')) // Creating the `public` folder as the static folder, allows our app to use the files in the `public` folder, like the JSS logo
app.use(
    session({
        secret: process.env.APP_SECRET,
        resave: false,
        saveUninitialized: false
    })
);
app.use(flash());
app.use(morgan('dev'));

app.use(setAuthStatus);
app.use(setFlashMessages);

try {
    createTablesIfNotExists(process.env);
} catch (error) {
    console.error("Error creating tables:", error);
    exit(1);
}

// Adding our routers
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import divisionRoutes from './routes/divisionRoutes.js';
import institutionRoutes from './routes/institutionRoutes.js';

app.use('/', adminRoutes);

app.use('/',authRoutes);

app.use('/', divisionRoutes);

app.use('/', institutionRoutes);

app.get('/',(req,res)=>{
    res.render('index.ejs');
})

// Main page - Will route to a different view based on the type of user
app.get("/home", allowLoggedIn, async(req,res) => {
    // Redirect to the correct page based on the type of user
    if (req.session.isAdmin) {
        res.redirect("/admin");
    } else if (req.session.isDivisionUser) {
        res.redirect("/division");
    } else if (req.session.isInstitutionUser) {
        res.redirect("/institution");
    } else {
        req.flash("danger","Was not able to redirect to the correct page");
        res.send("Was not able to redirect to the correct page"); // This is the only blank page in the app
    }
});

app.get('/go_back', allowLoggedIn, (req,res)=>{
    res.redirect("/home");
    return;
});

// View images
app.get("/view_image/:sl_no", allowLoggedIn, async(req,res)=>{
    const sl_no = req.params.sl_no;
    const isAdminBill = req.query.type === 'admin'; // Check if the image is an admin bill image. If it is, then the user must be an admin to view it and we need to fetch the image from the admin images table.

    if (!sl_no || isNaN(sl_no)) {
        req.flash("danger","Invalid request");
        res.redirect("/home");
        return;
    }
    
    if (isAdminBill) {
        const admin_query_result = await db.query("SELECT * FROM admin_bills WHERE sl_no = $1",[sl_no]);
        // If the user is an admin and it is an admin property image, just send it.
        if (req.session.isAdmin && admin_query_result.rows.length !== 0) {
            const image = admin_query_result.rows[0];
            res.setHeader('Content-Type', image.filetype);
            res.send(image.data);
            return;
        } else {
            req.flash("danger","No image found");
            console.log("No image found");
            res.redirect("/home");
            return;
        }
    }

    // Find if the image is in institution_bills or admin_bills
    const query_result = await db.query("SELECT * FROM institution_bills WHERE sl_no = $1",[sl_no]);

    if (query_result.rows.length === 0) {
        req.flash("danger","No image found");
        console.log("No image found");
        res.redirect("/home");
        return;
    }

    // Check if institution user is authorized to view the image
    if (!req.session.isAdmin && !req.session.isDivisionUser && req.session.isInstitutionUser && query_result.rows.length !== 0) {
        const check_owner = await db.query("SELECT institution_id FROM institution_payment_details WHERE sl_no = $1",[sl_no]);
        if (check_owner.rows[0].institution_id !== req.session.user_details?.institution_id) {
            req.flash("danger","You are not authorized to view this image");
            res.redirect("/home");
            return;
        }
    }
    // Check if division user is authorized to view the image for institution
    if (!req.session.isAdmin && req.session.isDivisionUser && query_result.rows.length !== 0) {
        const check_owner = await db.query("SELECT division_id FROM institution_users JOIN institution_payment_details ON institution_users.institution_id=institution_payment_details.institution_id WHERE sl_no = $1",[sl_no]);
        if (check_owner.rows[0].division_id !== req.session.user_details?.division_id) {
            req.flash("You are not authorized to view this image");
            res.redirect("/home");
            return;
        }
    }

    // Send the image
    const image = query_result.rows[0];
    res.setHeader('Content-Type', image.filetype);
    res.send(image.data);
    return;
});


app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});