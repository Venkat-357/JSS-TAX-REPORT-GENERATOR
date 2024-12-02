import express, { query } from 'express';
import pg from 'pg';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import multer from 'multer';
import morgan from 'morgan';
import flash from 'connect-flash';
dotenv.config(); // Load the environment variables from the .env file
import { exit } from 'process';

// Our custom imports
import createTablesIfNotExists from './utils/create_tables.js';
import {setAuthStatus } from './middleware/auth_wrap.js';
import { setFlashMessages } from './middleware/set_flash_messages.js';
import { allowAdmins, allowAdminsAndDivisionUsers, allowLoggedIn, allowDivisionUsers, allowInstitutionUsers, allowSiteUsers } from './middleware/restrict_routes.js';
import { validateEmail, validatePassword } from './utils/Validation.js';
import { addFlashMessages } from './utils/add_flash_messages.js';

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
// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for security
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed!'), false);
        }
    }
});
// Creating the `public` folder as the static folder, allows our app to use the files in the `public` folder, like the JSS logo
app.use(express.static('public'))
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


// Try to connect to the database
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

// Login methods - The same form is used for both admins, division, institution, and site users
// The login endpoint will automatically log in the user based on the type of user
app.get("/login", (req,res)=>{
    if (req.session.isLoggedIn) {
        res.redirect("/home");
        return;
    } else {
        res.render("login.ejs",addFlashMessages(req));
        return;
    }
});
import { login, logout } from './controllers/auth.js';
app.post("/login", async (req,res)=> login(req,res,db));

app.get("/logout", async(req,res)=> logout(req,res));

// Main page - Will route to a different view based on the type of user
app.get("/home", allowLoggedIn, async(req,res) => {
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
app.get("/admin", allowAdmins, (req,res)=>{
    res.render("admin.ejs",addFlashMessages(req));
    return;
});

app.get('/go_back', allowLoggedIn, (req,res)=>{
    res.redirect("/home");
    return;
});

// Getting a list of all division users for viewing by admins
app.get("/list_all_division_users", allowAdmins, async(req,res) => {
    const queryResult = await db.query("SELECT * FROM division_users");
    const information = queryResult.rows;
    res.render("list_all_division_users.ejs",{
        information : information,
    });
    return;
});

//handling the modify option to modify the division users details by the admin
app.get("/modify_division_user", allowAdmins, async(req,res)=>{
    let division_identification = req.query['division_id'];
    if(!division_identification) {
        res.send("The page you are looking for is not available");
        return;
    }
    const query_result = await db.query("SELECT * FROM division_users WHERE division_id=$1",[division_identification]);
    const retrieved_info = query_result.rows[0];
    if(!retrieved_info) {
        res.send("The data you are looking for is not available");
        return;
    }
    res.render("modify_division_users.ejs",{
        retrieved_info : retrieved_info,
    });
    return;
});

app.post("/modify_division_user",allowAdmins, async(req,res)=>{
    const division_id = req.body['division-id'];
    const division = req.body.division;
    const email = req.body.email;
    const password = req.body.password;
    const phone_number = req.body.phone;
    const admin_id = req.session.user_details.admin_id;

    // Validate the input fields
    if (!validateEmail(email)) {
        res.send("Invalid email");
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (!phone_number || phone_number.length !== 10 || !/^\d+$/.test(phone_number)) {
        res.send("Invalid phone number");
        return;
    }

    if(isNaN(admin_id)) {
        res.send("Invalid admin id");
        return;
    }
    // Check if the division id, email, and phone number already exist
    /*let query_result = await db.query(`SELECT * FROM division_users WHERE division_id = $1`,[division_id]);
    if(query_result.rows.length !== 0) {
        res.send("Division id already exists");
        return;
    }*/
    // We have to make sure that the email is unique across all the users, because login depends on the email
    /* query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
        UNION SELECT email FROM admins WHERE email = '${email}'
        UNION SELECT email FROM institution_users WHERE email = '${email}'
        UNION SELECT email FROM site_users WHERE email = '${email}'`);
    if(query_result.rows.length !== 0) {
        res.send("Email already exists");
        return;
    }
    query_result = await db.query(`SELECT * FROM division_users WHERE phone_number = $1 AND division_id != $2`,[phone_number,division_id]);
    if(query_result.rows.length !== 0) {
        res.send("Phone number already exists");
        return;
    }*/

    try {
        await db.query(`UPDATE division_users SET admin_id=$1,division_id=$2,division=$3,email=$4,password=$5,phone_number=$6 WHERE division_id=$7`,[admin_id,division_id,division,email,password,phone_number,division_id]);
        console.log("division user details are updated successfully");
        res.redirect("/list_all_division_users");
        return;
    } catch (error) {
        console.log("failed to update division user details");
        res.redirect("/modify_division_users");
        return;
    }

});

//handling the route to delete the selected division user by admin
app.get("/delete_division", allowAdmins, async(req,res)=>{
    const division_identification = req.query['division_id'];
    await db.query("DELETE FROM division_users WHERE division_id=$1",[division_identification]);
    console.log("the division user is deleted successfully");
    res.redirect("/list_all_division_users");
});

// Getting a list of all institution users for viewing by admins
app.get("/list_all_institution_users", allowAdmins, async(req,res) => {
    const query_result = await db.query("SELECT * FROM institution_users");
    const information = query_result.rows;
    res.render("list_all_institution_users.ejs",{
        information : information,
    });
    return;
});

// Getting a list of all site users for viewing by admins
app.get("/list_all_site_users", allowAdmins, async(req,res)=>{
    const query_result = await db.query("SELECT * FROM site_users");
    const information = query_result.rows;
    res.render("list_all_site_users.ejs",{
        information : information,
    });
    return;
});

// Getting a list of all payment details for viewing by admins
app.get("/list_all_payment_details", allowAdmins, async(req,res)=>{
    const selected_year = req.query?.selected_year;
    // TODO: Need to show division details by joining that table here too
    // NOTE: LEFT JOIN TO DISPLAY EVEN IF THE BILL IS NOT UPLOADED
    //dispay the payment details if and only if the current year details are provided else display all the details
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no");
        const site_payment_details_query_result = await db.query("SELECT site_payment_details.*, site_bills.sl_no AS bill_sl_no FROM site_payment_details JOIN site_users ON site_payment_details.site_id = site_users.site_id LEFT JOIN site_bills ON site_payment_details.sl_no = site_bills.sl_no");
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        const site_payment_details_in_division = site_payment_details_query_result.rows;
        res.render("list_all_payment_details.ejs",{
            institution_payment_details_in_division : institution_payment_details_in_division,
            site_payment_details_in_division : site_payment_details_in_division,
            selected_year : selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_payment_details.payment_year = $1",[selected_year]);
        const site_payment_details_query_result = await db.query("SELECT site_payment_details.*, site_bills.sl_no AS bill_sl_no FROM site_payment_details JOIN site_users ON site_payment_details.site_id = site_users.site_id LEFT JOIN site_bills ON site_payment_details.sl_no = site_bills.sl_no WHERE site_payment_details.payment_year = $1",[selected_year]);
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        const site_payment_details_in_division = site_payment_details_query_result.rows;
        res.render("list_all_payment_details.ejs",{
            institution_payment_details_in_division : institution_payment_details_in_division,
            site_payment_details_in_division : site_payment_details_in_division,
            selected_year : selected_year,
        });
        return;
    }
});

// Creating a new divison/user by admins
app.get("/create_new_division", allowAdmins, async(req,res) => {
    res.render("create_new_division.ejs");
    return;
});

app.post("/create_new_division", allowAdmins, async(req,res) => {
    const division_id = req.body[`division-id`];
    const division = req.body.division;
    const email = req.body.email;
    const password = req.body.password;
    const phone_number = req.body.phone;
    const admin_id = req.session.user_details.admin_id;

    // Validate the input fields
    if (!validateEmail(email)) {
        res.send("Invalid email");
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (phone_number.length !== 10 || isNaN(phone_number)) {
        res.send("Invalid phone number");
        return;
    }

    if (isNaN(admin_id)) {
        res.send("Invalid admin id");
        return;
    }
    // Check if the division id, email, and phone number already exist
    let query_result = await db.query(`SELECT * FROM division_users WHERE division_id = $1`,[division_id]);
    if (query_result.rows.length !== 0) {
        res.send("Division id already exists");
        return;
    }
    // We have to make sure that the email is unique across all the users, because login depends on the email
    query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
                                    UNION SELECT email FROM admins WHERE email = '${email}'
                                    UNION SELECT email FROM institution_users WHERE email = '${email}'
                                    UNION SELECT email FROM site_users WHERE email = '${email}'`);
    if (query_result.rows.length !== 0) {
        res.send("Email already exists");
        return;
    }
    query_result = await db.query(`SELECT * FROM division_users WHERE phone_number = $1`,[phone_number]);
    if (query_result.rows.length !== 0) {
        res.send("Phone number already exists");
        return;
    }

    try {
        await db.query(`INSERT INTO division_users (admin_id,division_id,division,email,password,phone_number) VALUES($1,$2,$3,$4,$5,$6)`,[admin_id,division_id,division,email,password,phone_number]);
        console.log("new division user is added successfully");
        res.redirect("/list_all_division_users");
        return;
    } catch (error) {
        console.log("failed to add a new division user");
        res.redirect("/create_new_division");
        return;
    }
});


// Division users' dashboard page
app.get("/division", allowDivisionUsers, async(req,res) => {
    // Get all institution and site users details who haven't made an entry into the payment details table for the current year
    // This will help the division user to know who hasn't paid yet

    // Get the current year
    const currentYear = new Date().getFullYear();
    // Get the division id
    const division_id = req.session.user_details.division_id;
    // Get the institution users who haven't paid yet
    const institutionUsersQuery = `SELECT institution_id, khatha_or_property_no, phone_number FROM institution_users WHERE division_id = '${division_id}' AND institution_id NOT IN (SELECT institution_id FROM institution_payment_details WHERE payment_year = '${currentYear}')`;
    // Get the site users who haven't paid yet
    const siteUsersQuery = `SELECT site_id, khatha_or_property_no, phone_number FROM site_users WHERE division_id = '${division_id}' AND site_id NOT IN (SELECT site_id FROM site_payment_details WHERE payment_year = '${currentYear}')`;
    // Query the database
    const query_result = await db.query(institutionUsersQuery);
    const institutionUsers = query_result.rows;
    const siteUsersQueryResult = await db.query(siteUsersQuery);
    const siteUsers = siteUsersQueryResult.rows;
    if (institutionUsers || siteUsers) {
        req.flash("info", `The users who haven't paid yet are displayed below, please remind them to pay for this year :${currentYear}`);
        if (institutionUsers.length >= 0) {
            req.flash("warning", `Institution users who haven't paid yet:
                ${institutionUsers.map(user => `Institution ID: ${user.institution_id}, Khatha/Property No: ${user.khatha_or_property_no}, Phone Number: ${user.phone_number}`).join('\n')}`);
        }
        if (siteUsers.length >= 0) {
            req.flash("warning", `Site users who haven't paid yet:
                                ${siteUsers.map(user => `Site ID: ${user.site_id}, Khatha/Property No: ${user.khatha_or_property_no}, Phone Number: ${user.phone_number}`).join('\n')}`);
        }
    }
    res.render("division.ejs",addFlashMessages(req));
    return;
});

// Getting a list of all institution users under a division for viewing by a division user
app.get("/list_institution_users_in_division", allowDivisionUsers, async(req,res) => {
    const queryResult = await db.query(`SELECT institution_id,institution_users.email,country,state,district,taluk,institution_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building FROM institution_users JOIN division_users ON institution_users.division_id = division_users.division_id WHERE division_users.division_id = '${req.session.user_details.division_id}'`);
    const information = queryResult.rows;
    res.render("list_institution_users_in_division.ejs",{
        information : information,
    });
    return;
});

//handling the request to modify the institution user details by the division user
app.get("/modify_institution", allowDivisionUsers, async(req,res)=>{
    const institution_identification = req.query['institution_id'];
    console.log(institution_identification);
    
    const query_result = await db.query("SELECT * FROM institution_users WHERE institution_id=$1",[institution_identification]);
    const retrieved_info = query_result.rows[0];
    console.log(retrieved_info);
    if(!retrieved_info)
    {
        console.log("the data you are requesting for is not available");
        return;
    }
    res.render("modify_institution_users.ejs",{
        retrieved_info : retrieved_info,
    });
    return;
});

app.post("/modify_institution_users", allowDivisionUsers, async(req,res)=>{
    const division_id = req.body[`division-id`];
    const email = req.body.email;
    const password = req.body.password;
    const phone_number = req.body[`phone-number`];
    const institution_id = req.body[`institution-id`];
    const country = req.body.country;
    const state = req.body.state;
    const district = req.body.district;
    const taluk = req.body.taluk;
    const institution_name = req.body[`institution-name`];
    const village = req.body.village;
    const pid = req.body.pid;
    const khatha_no = req.body[`khatha-no`];
    const khathadar_name = req.body[`khathadar-name`];
    const building_type = req.body[`type-of-building`];

    // Validate the input fields
    if (!validateEmail(email)) {
        res.send("Invalid email");
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (phone_number.length !== 10 || isNaN(phone_number)) {
        res.send("Invalid phone number");
        return;
    }
    /*if ( division_id !== req.session.user_details.division_id) {
        res.send("Invalid division id");
        return;
    }*/
    // Check if the Institution id, email, and phone number already exist
    /*let query_result = await db.query(`SELECT * FROM institution_users WHERE institution_id = $1`,[institution_id]);
    if (query_result.rows.length !== 0) {
        res.send("Institution id already exists");
        return;
    }
    // We have to make sure that the email is unique across all the users, because login depends on the email
    query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
                                    UNION SELECT email FROM admins WHERE email = '${email}'
                                    UNION SELECT email FROM institution_users WHERE email = '${email}'
                                    UNION SELECT email FROM site_users WHERE email = '${email}'`);
    if (query_result.rows.length !== 0) {
        res.send("Email already exists");
        return;
    }
    query_result = await db.query(`SELECT * FROM institution_users WHERE phone_number = $1`,[phone_number]);
    if (query_result.rows.length !== 0) {
        res.send("Phone number already exists");
        return;
    }*/
    try {
        await db.query(`UPDATE institution_users SET division_id=$1,email=$2,password=$3,phone_number=$4,institution_id=$5,country=$6,state=$7,district=$8,taluk=$9,institution_name=$10,village_or_city=$11,pid=$12,khatha_or_property_no=$13,name_of_khathadar=$14,type_of_building=$15 WHERE institution_id=$16`,[division_id,email,password,phone_number,institution_id,country,state,district,taluk,institution_name,village,pid,khatha_no,khathadar_name,building_type,institution_id]);
        console.log("modified institution user details are added successfully");
        res.redirect("/list_institution_users_in_division");
        return;
    } catch (error) {
        console.log("failed to add a modified institution user details");
        res.redirect("/modify_institution_users");
        return;
    }
});

//handling the route to delete the institution user by division user
app.get("/delete_institution", allowDivisionUsers ,async(req,res)=>{
    const institution_identification = req.query['institution_id'];
    console.log(institution_identification);
    await db.query("DELETE FROM institution_users WHERE institution_id = $1",[institution_identification]);
    console.log("the institution user is deleted successfully");
    return;
});

// Getting a list of all site users under a division for viewing by a division user
app.get("/list_site_users_in_division", allowDivisionUsers, async(req,res) => {
    const queryResult = await db.query(`SELECT site_id,site_users.email,country,state,district,taluk,site_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building FROM site_users JOIN division_users ON site_users.division_id = division_users.division_id WHERE division_users.division_id = '${req.session.user_details.division_id}'`);
    const information = queryResult.rows;
    res.render("list_site_users_in_division.ejs",{
        information : information,
    });
    return;
});

//handling the request to modify the site user details by the division user
app.get("/modify_site", allowDivisionUsers, async(req,res)=>{
    const site_identification = req.query['site_id'];
    console.log(site_identification);
    
    const query_result = await db.query("SELECT * FROM site_users WHERE site_id=$1",[site_identification]);
    const retrieved_info = query_result.rows[0];
    console.log(retrieved_info);
    if(!retrieved_info)
    {
        console.log("the data you are requesting for is not available");
        return;
    }
    res.render("modify_site_users.ejs",{
        retrieved_info : retrieved_info,
    });
    return;
});

app.post("/modify_site_users", allowDivisionUsers, async(req,res)=>{
    const division_id = req.body[`division-id`];
    const email = req.body.email;
    const password = req.body.password;
    const phone_number = req.body[`phone-number`];
    const site_id = req.body[`site-id`];
    const country = req.body.country;
    const state = req.body.state;
    const district = req.body.district;
    const taluk = req.body.taluk;
    const site_name = req.body[`site-name`];
    const village = req.body.village;
    const pid = req.body.pid;
    const khatha_no = req.body[`khatha-no`];
    const khathadar_name = req.body[`khathadar-name`];
    const building_type = req.body[`type-of-building`];

    // Validate the input fields
    if (!validateEmail(email)) {
        res.send("Invalid email");
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (phone_number.length !== 10 || isNaN(phone_number)) {
        res.send("Invalid phone number");
        return;
    }
    /*if ( division_id !== req.session.user_details.division_id) {
        res.send("Invalid division id");
        return;
    }*/
    // Check if the Institution id, email, and phone number already exist
    /*let query_result = await db.query(`SELECT * FROM institution_users WHERE institution_id = $1`,[institution_id]);
    if (query_result.rows.length !== 0) {
        res.send("Institution id already exists");
        return;
    }
    // We have to make sure that the email is unique across all the users, because login depends on the email
    query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
                                    UNION SELECT email FROM admins WHERE email = '${email}'
                                    UNION SELECT email FROM institution_users WHERE email = '${email}'
                                    UNION SELECT email FROM site_users WHERE email = '${email}'`);
    if (query_result.rows.length !== 0) {
        res.send("Email already exists");
        return;
    }
    query_result = await db.query(`SELECT * FROM institution_users WHERE phone_number = $1`,[phone_number]);
    if (query_result.rows.length !== 0) {
        res.send("Phone number already exists");
        return;
    }*/
    try {
        await db.query(`UPDATE site_users SET division_id=$1,email=$2,password=$3,phone_number=$4,site_id=$5,country=$6,state=$7,district=$8,taluk=$9,site_name=$10,village_or_city=$11,pid=$12,khatha_or_property_no=$13,name_of_khathadar=$14,type_of_building=$15 WHERE site_id=$16`,[division_id,email,password,phone_number,site_id,country,state,district,taluk,site_name,village,pid,khatha_no,khathadar_name,building_type,site_id]);
        console.log("modified site user details are added successfully");
        res.redirect("/list_site_users_in_division");
        return;
    } catch (error) {
        console.log("failed to add a modified site user details");
        res.redirect("/modify_site_users");
        return;
    }
});

//handling the route to delete the site user by the division user
app.get("/delete_site", allowDivisionUsers, async(req,res)=>{
    const site_identification = req.query['site_id'];
    console.log(site_identification);
    await db.query("DELETE FROM site_users WHERE site_id=$1",[site_identification]);
    console.log("the site user is deleted successfully");
    return;
});

// Getting a list of all payment details under a division for viewing by a division user
app.get("/list_payment_details_in_division", allowDivisionUsers, async(req,res) => {
    const selected_year = req.query?.selected_year;
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query(`SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.division_id = '${req.session.user_details.division_id}'`);
        const site_payment_details_query_result = await db.query(`SELECT site_payment_details.*, site_bills.sl_no AS bill_sl_no FROM site_payment_details JOIN site_users ON site_payment_details.site_id = site_users.site_id LEFT JOIN site_bills ON site_payment_details.sl_no = site_bills.sl_no WHERE site_users.division_id = '${req.session.user_details.division_id}'`);
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        const site_payment_details_in_division = site_payment_details_query_result.rows;
        res.render("list_payment_details_in_division.ejs",{
            institution_payment_details_in_division,
            site_payment_details_in_division,
            selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.division_id = $1 AND institution_payment_details.payment_year=$2",[req.session.user_details.division_id,selected_year]);
        const site_payment_details_query_result = await db.query("SELECT site_payment_details.*, site_bills.sl_no AS bill_sl_no FROM site_payment_details JOIN site_users ON site_payment_details.site_id = site_users.site_id LEFT JOIN site_bills ON site_payment_details.sl_no = site_bills.sl_no WHERE site_users.division_id = $1 AND site_payment_details.payment_year=$2",[req.session.user_details.division_id,selected_year]);
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        const site_payment_details_in_division = site_payment_details_query_result.rows;
        res.render("list_payment_details_in_division.ejs",{
            institution_payment_details_in_division,
            site_payment_details_in_division,
            selected_year,
        });
        return;
    }
});

//code to handle the APPROVE button by the division users approving institution payment details
app.get("/approve_institution_payment_details", allowDivisionUsers, async (req, res) => {
    const sl_no = req.query.sl_no;
    try {
        // Validate sl_no
        if (!sl_no) {
            res.status(400).send("Invalid request. Missing sl_no.");
            return;
        }

        // Check if the record exists
        const recordCheck = await db.query("SELECT * FROM institution_payment_details WHERE sl_no = $1", [sl_no]);
        if (recordCheck.rowCount === 0) {
            res.status(404).send("Payment details not found.");
            return;
        }

        // Approve the payment
        await db.query("UPDATE institution_payment_details SET approval_status = true WHERE sl_no = $1", [sl_no]);

        console.log(`Payment details with sl_no ${sl_no} approved successfully.`);
        //res.status(200).send("Payment details approved successfully.");
        res.redirect("/list_payment_details_in_division");
        return;
    } catch (error) {
        console.error("Error approving payment details:", error);
        //res.status(500).send("An error occurred while approving payment details.");
        res.redirect("/list_payment_details_in_division");
        return;
    }
});

//code to handle the APPROVE button by the division users approving site payment details
app.get("/approve_site_payment_details", allowDivisionUsers, async (req, res) => {
    const sl_no = req.query.sl_no;
    try {
        // Validate sl_no
        if (!sl_no) {
            res.status(400).send("Invalid request. Missing sl_no.");
            return;
        }

        // Check if the record exists
        const recordCheck = await db.query("SELECT * FROM site_payment_details WHERE sl_no = $1", [sl_no]);
        if (recordCheck.rowCount === 0) {
            res.status(404).send("Payment details not found.");
            return;
        }

        // Approve the payment
        await db.query("UPDATE site_payment_details SET approval_status = true WHERE sl_no = $1", [sl_no]);

        console.log(`Payment details with sl_no ${sl_no} approved successfully.`);
        //res.status(200).send("Payment details approved successfully.");
        res.redirect("/list_payment_details_in_division");
        return;
    } catch (error) {
        console.error("Error approving payment details:", error);
        //res.status(500).send("An error occurred while approving payment details.");
        res.redirect("/list_payment_details_in_division");
        return;
    }
});

// Create new institution users by division users
// NEEDS MORE RIGOOROUS TESTING
app.get("/create_new_institution", allowDivisionUsers, (req,res)=>{
    res.render("create_new_institution.ejs", 
        {division_id: req.session.user_details.division_id}
    );
    return;
});

app.post("/create_new_institution", allowDivisionUsers, async(req,res)=>{
    const division_id = req.body[`division-id`];
    const email = req.body.email;
    const password = req.body.password;
    const phone_number = req.body[`phone-number`];
    const institution_id = req.body[`institution-id`];
    const country = req.body.country;
    const state = req.body.state;
    const district = req.body.district;
    const taluk = req.body.taluk;
    const institution_name = req.body[`institution-name`];
    const village = req.body.village;
    const pid = req.body.pid;
    const khatha_no = req.body[`khatha-no`];
    const khathadar_name = req.body[`khathadar-name`];
    const building_type = req.body[`type-of-building`];

    // Validate the input fields
    if (!validateEmail(email)) {
        res.send("Invalid email");
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (phone_number.length !== 10 || isNaN(phone_number)) {
        res.send("Invalid phone number");
        return;
    }
    if ( division_id !== req.session.user_details.division_id) {
        res.send("Invalid division id");
        return;
    }
    // Check if the Institution id, email, and phone number already exist
    let query_result = await db.query(`SELECT * FROM institution_users WHERE institution_id = $1`,[institution_id]);
    if (query_result.rows.length !== 0) {
        res.send("Institution id already exists");
        return;
    }
    // We have to make sure that the email is unique across all the users, because login depends on the email
    query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
                                    UNION SELECT email FROM admins WHERE email = '${email}'
                                    UNION SELECT email FROM institution_users WHERE email = '${email}'
                                    UNION SELECT email FROM site_users WHERE email = '${email}'`);
    if (query_result.rows.length !== 0) {
        res.send("Email already exists");
        return;
    }
    query_result = await db.query(`SELECT * FROM institution_users WHERE phone_number = $1`,[phone_number]);
    if (query_result.rows.length !== 0) {
        res.send("Phone number already exists");
        return;
    }

    try {
        await db.query(`INSERT INTO institution_users (division_id,email,password,phone_number,institution_id,country,state,district,taluk,institution_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,[division_id,email,password,phone_number,institution_id,country,state,district,taluk,institution_name,village,pid,khatha_no,khathadar_name,building_type]);
        console.log("new institution user added successfully");
        res.redirect("/list_institution_users_in_division");
        return;
    } catch (error) {
        console.log("failed to add a new institution user");
        console.log(error)
        res.redirect("/create_new_institution");
        return;
    }
});


// Create new site users by division users
// NEEDS MORE RIGOOROUS TESTING
app.get("/create_new_site", allowDivisionUsers, (req,res)=>{
    res.render("create_new_site.ejs", 
        {division_id: req.session.user_details.division_id}
    );
    return;
});

app.post("/create_new_site", allowDivisionUsers, async(req,res)=>{
    const division_id = req.body[`division-id`];
    const email = req.body.email;
    const password = req.body.password;
    const phone_number = req.body[`phone-number`];
    const site_id = req.body[`site-id`];
    const country = req.body.country;
    const state = req.body.state;
    const district = req.body.district;
    const taluk = req.body.taluk;
    const site_name = req.body[`site-name`];
    const village = req.body.village;
    const pid = req.body.pid;
    const khatha_no = req.body[`khatha-no`];
    const khathadar_name = req.body[`khathadar-name`];
    const building_type = req.body[`type-of-building`];

    // Validate the input fields
    if (!validateEmail(email)) {
        res.send("Invalid email");
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (phone_number.length !== 10 || isNaN(phone_number)) {
        res.send("Invalid phone number");
        return;
    }
    if ( division_id !== req.session.user_details.division_id) {
        res.send("Invalid division id");
        return;
    }
    // Check if the site id, email, and phone number already exist
    let query_result = await db.query(`SELECT * FROM site_users WHERE site_id = $1`,[site_id]);
    if (query_result.rows.length !== 0) {
        res.send("site id already exists");
        return;
    }
    // We have to make sure that the email is unique across all the users, because login depends on the email
    query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
                                    UNION SELECT email FROM admins WHERE email = '${email}'
                                    UNION SELECT email FROM institution_users WHERE email = '${email}'
                                    UNION SELECT email FROM site_users WHERE email = '${email}'`);
    if (query_result.rows.length !== 0) {
        res.send("Email already exists");
        return;
    }
    query_result = await db.query(`SELECT * FROM site_users WHERE phone_number = $1`,[phone_number]);
    if (query_result.rows.length !== 0) {
        res.send("Phone number already exists");
        return;
    }

    try {
        await db.query(`INSERT INTO site_users (division_id,email,password,phone_number,site_id,country,state,district,taluk,site_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,[division_id,email,password,phone_number,site_id,country,state,district,taluk,site_name,village,pid,khatha_no,khathadar_name,building_type]);
        console.log("new site user added successfully");
        res.redirect("/list_site_users_in_division");
        return;
    } catch (error) {
        console.log("failed to add a new site user");
        console.log(error);
        res.redirect("/create_new_site");
        return;
    }
});

//handling the /institution route and displaying the home page of institution users
app.get("/institution",allowInstitutionUsers,(req,res)=>{
    res.render("institution.ejs",addFlashMessages(req));
    return;
});

//handling the /list_payment_details_in_institution route to display all the institution payment details  
app.get("/list_payment_details_in_institution", allowInstitutionUsers, async(req,res)=>{
    const selected_year = req.query?.selected_year;
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no  FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.institution_id = $1",[req.session.user_details.institution_id]);
        const information = institution_payment_details_query_result.rows;
        res.render("list_payment_details_in_institution.ejs",{
            information : information,
            selected_year : selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.institution_id = $1 AND institution_payment_details.payment_year = $2",[req.session.user_details.institution_id,selected_year]);
        const information = institution_payment_details_query_result.rows;
        res.render("list_payment_details_in_institution.ejs",{
            information : information,
            selected_year : selected_year,
        });
        return;
    }
});

//handling the /new_institution_payment_details route and displaying the page to add new institution users
app.get("/new_institution_payment_details",allowInstitutionUsers,(req,res)=>{
    res.render("new_institution_payment_details.ejs",{
        institution_id:req.session.user_details.institution_id,
    });
    return;
});

//handling the /new_institution_payment_details route to upload the new institution payment details to the database
app.post("/new_institution_payment_details",allowInstitutionUsers,upload.single('image'),async(req,res)=>{
    const institution_id = req.body[`institution-id`];
    const payment_year = req.body[`payment-year`];
    const receipt_no = req.body['receipt-no'];
    const property_tax = req.body[`property-tax`];
    const rebate = req.body.rebate;
    const service_tax = req.body[`service-tax`];
    const dimension_of_vacant_area = req.body[`dimension-of-vacant-area-in-sqft`];
    const dimension_of_building_area = req.body[`dimension-of-building-area-in-sqft`];
    const total_dimension = req.body[`total-dimension`];
    const department_paid = req.body[`department-paid`];
    const cesses = req.body.cesses;
    const interest = req.body.interest;
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    try {
            let sl_no = await db.query("INSERT INTO institution_payment_details (institution_id,payment_year,receipt_no_or_date,property_tax,rebate,service_tax,dimension_of_vacant_area_sqft,dimension_of_building_area_sqft,total_dimension_in_sqft,to_which_department_paid,cesses,interest,total_amount,remarks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING sl_no",[institution_id,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,department_paid,cesses,interest,total_amount,remarks]);
            if(req.file) {
            const fileBuffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const fileName = req.file.originalname;
            //insert the image into database
            await db.query(`INSERT INTO institution_bills (sl_no,fileName,filetype,data) VALUES (${sl_no.rows[0].sl_no},$1,$2,$3)`,[fileName,fileType,fileBuffer]);
            }
            console.log("new institution payment details are added successfully");
            res.redirect("/list_payment_details_in_institution");
            return;
        } catch (error) {
            console.log("failed to add the new institution payment details");
            console.log(error);
            res.redirect("/new_institution_payment_details");
            return;
        }
});

//handling the route to modify the institution payment details by the respective institution user
app.get("/modify_institution_payment_details", allowInstitutionUsers, async(req,res)=>{
    const sl_no = req.query['sl_no'];
    const query_result = await db.query("SELECT * FROM institution_payment_details WHERE sl_no=$1",[sl_no]);
    const retrieved_info = query_result.rows[0];
    if(!retrieved_info)
    {
        console.log("the data you are looking for is not available");
        return;
    }
    res.render("modify_institution_payment_details.ejs",{
        retrieved_info : retrieved_info,
    });
    return;
});

app.post("/modify_institution_payment_details", allowInstitutionUsers, upload.single('image'), async(req,res)=>{
    const institution_id = req.body[`institution-id`];
    const payment_year = req.body[`payment-year`];
    const receipt_no = req.body['receipt-no'];
    const property_tax = req.body[`property-tax`];
    const rebate = req.body.rebate;
    const service_tax = req.body[`service-tax`];
    const dimension_of_vacant_area = req.body[`dimension-of-vacant-area-in-sqft`];
    const dimension_of_building_area = req.body[`dimension-of-building-area-in-sqft`];
    const total_dimension = req.body[`total-dimension`];
    const department_paid = req.body[`department-paid`];
    const cesses = req.body.cesses;
    const interest = req.body.interest;
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    try {
        let sl_no = await db.query("UPDATE institution_payment_details SET institution_id=$1,payment_year=$2,receipt_no_or_date=$3,property_tax=$4,rebate=$5,service_tax=$6,dimension_of_vacant_area_sqft=$7,dimension_of_building_area_sqft=$8,total_dimension_in_sqft=$9,to_which_department_paid=$10,cesses=$11,interest=$12,total_amount=$13,remarks=$14 WHERE institution_id=$15 RETURNING sl_no",[institution_id,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,department_paid,cesses,interest,total_amount,remarks,institution_id]);
        if(req.file) {
            const fileBuffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const fileName = req.file.originalname;
            //insert the image into database
            await db.query("UPDATE institution_bills SET sl_no=$1,data=$2,fileType=$3,fileName=$4",[sl_no.rows[0].sl_no,fileBuffer,fileType,fileName]);
            }
            console.log("modified institution payment details are added successfully");
            res.redirect("/list_payment_details_in_institution");
            return;
    } catch (error) {
        console.log("failed to add the modified institution payment details");
        console.log(error);
        res.redirect("/modify_institution_payment_details");
        return;
    }
});

//handling the route to delete the payment details of institution users
app.get("/delete_payment_details", allowInstitutionUsers, async(req,res)=>{
    const sl_no = req.query['sl_no'];
    console.log(sl_no);
    await db.query("DELETE FROM institution_payment_details WHERE sl_no=$1",[sl_no]);
    console.log("the institution payment details are deleted successfully");
    res.redirect('/list_payment_details_in_institution');
    return;
});

//handling the /site route and displaying the home page of site users
app.get("/site",allowSiteUsers,allowSiteUsers,(req,res)=>{
    res.render("site.ejs",addFlashMessages(req));
    return;
});


//handling the /list_payment_details_in_site route to display all the site payment details
app.get("/list_payment_details_in_site", allowSiteUsers, async(req,res)=>{
    const selected_year = req.query?.selected_year;
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query(`SELECT site_payment_details.*, site_bills.sl_no AS bill_sl_no FROM site_payment_details JOIN site_users ON site_payment_details.site_id = site_users.site_id LEFT JOIN site_bills ON site_payment_details.sl_no = site_bills.sl_no WHERE site_users.site_id = '${req.session.user_details.site_id}'`);
        const information = institution_payment_details_query_result.rows;
        res.render("list_payment_details_in_site.ejs",{
            information : information,
            selected_year : selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT site_payment_details.*, site_bills.sl_no AS bill_sl_no FROM site_payment_details JOIN site_users ON site_payment_details.site_id = site_users.site_id LEFT JOIN site_bills ON site_payment_details.sl_no = site_bills.sl_no WHERE site_users.site_id = $1 AND site_payment_details.payment_year = $2",[req.session.user_details.site_id,selected_year]);
        const information = institution_payment_details_query_result.rows;
        res.render("list_payment_details_in_site.ejs",{
            information : information,
            selected_year : selected_year,
        });
        return;
    }
});

//handling the /new_site_payment_details route to display the page to add new site payment details
app.get("/new_site_payment_details",allowSiteUsers,(req,res)=>{
    res.render("new_site_payment_details.ejs",{
        site_id : req.session.user_details.site_id,
    });
    return;
})

//handling the /new_site_payment_details route to upload the new site payment details to the database
app.post("/new_site_payment_details",allowSiteUsers, upload.single('image'), async(req,res)=>{
    const site_id = req.body[`site-id`];
    const payment_year = req.body[`payment-year`];
    const receipt_no = req.body['receipt-no'];
    const property_tax = req.body[`property-tax`];
    const rebate = req.body.rebate;
    const service_tax = req.body[`service-tax`];
    const dimension_of_vacant_area = req.body[`dimension-of-vacant-area-in-sqft`];
    const dimension_of_building_area = req.body[`dimension-of-building-area-in-sqft`];
    const total_dimension = req.body[`total-dimension`];
    const department_paid = req.body[`department`];
    const cesses = req.body.cesses;
    const interest = req.body.interest;
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    try {
        let sl_no = await db.query("INSERT INTO site_payment_details (site_id,payment_year,receipt_no_or_date,property_tax,rebate,service_tax,dimension_of_vacant_area_sqft,dimension_of_building_area_sqft,total_dimension_in_sqft,to_which_department_paid,cesses,interest,total_amount,remarks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING sl_no",[site_id,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,department_paid,cesses,interest,total_amount,remarks]);
        if(req.file) {
            const fileBuffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const fileName = req.file.originalname;
            //insert the image into database
            await db.query(`INSERT INTO site_bills (sl_no,data,fileType,fileName) VALUES (${sl_no.rows[0].sl_no},$1,$2,$3)`,[fileBuffer,fileType,fileName]);
            }
            console.log("new site payment details are added successfully");
            res.redirect("/list_payment_details_in_site");
            return;
    } catch (error) {
        console.log("failed to add the new site payment details");
        console.log(error);
        res.redirect("/new_site_payment_details");
        return;
    }
});

//handling the route to modify the site payment details by the respective site user
app.get("/modify_site_payment_details", allowSiteUsers, async(req,res)=>{
    const sl_no = req.query['sl_no'];
    const query_result = await db.query("SELECT * FROM site_payment_details WHERE sl_no=$1",[sl_no]);
    const retrieved_info = query_result.rows[0];
    if(!retrieved_info)
    {
        console.log("the data you are looking for is not available");
        return;
    }
    res.render("modify_site_payment_details.ejs",{
        retrieved_info : retrieved_info,
    });
    return;
});

app.post("/modify_site_payment_details", allowSiteUsers, upload.single('image'), async(req,res)=>{
    const site_id = req.body[`site-id`];
    const payment_year = req.body[`payment-year`];
    const receipt_no = req.body['receipt-no'];
    const property_tax = req.body[`property-tax`];
    const rebate = req.body.rebate;
    const service_tax = req.body[`service-tax`];
    const dimension_of_vacant_area = req.body[`dimension-of-vacant-area-in-sqft`];
    const dimension_of_building_area = req.body[`dimension-of-building-area-in-sqft`];
    const total_dimension = req.body[`total-dimension`];
    const department_paid = req.body[`department-paid`] || 'default_department';
    const cesses = req.body.cesses;
    const interest = req.body.interest;
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    try {
        let sl_no = await db.query("UPDATE site_payment_details SET site_id=$1,payment_year=$2,receipt_no_or_date=$3,property_tax=$4,rebate=$5,service_tax=$6,dimension_of_vacant_area_sqft=$7,dimension_of_building_area_sqft=$8,total_dimension_in_sqft=$9,to_which_department_paid=$10,cesses=$11,interest=$12,total_amount=$13,remarks=$14 WHERE site_id=$15 returning sl_no",[site_id,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,department_paid,cesses,interest,total_amount,remarks,site_id]);
        if(req.file) {
            const fileBuffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const fileName = req.file.originalname;
            //insert the image into database
            await db.query("UPDATE site_bills SET sl_no=$1,data=$2,fileType=$3,fileName=$4",[sl_no.rows[0].sl_no,fileBuffer,fileType,fileName]);
            }
            console.log("modified site payment details are added successfully");
            res.redirect("/list_payment_details_in_site");
            return;
    } catch (error) {
        console.log("failed to add the modified site payment details");
        console.log(error);
        res.redirect("/modify_site_payment_details");
        return;
    }
});

//handling the route to delete the payment details of the site users
app.get("/delete_site_payment_details", allowSiteUsers, async(req,res)=>{
    const sl_no = req.query['sl_no'];
    console.log(sl_no);
    await db.query("DELETE FROM site_payment_details WHERE sl_no=$1",[sl_no]);
    console.log("the site payment details are deleted successfully");
    res.redirect("/list_payment_details_in_site");
    return;
});

// View images
app.get("/view_image/:sl_no", allowLoggedIn, async(req,res)=>{
    const sl_no = req.params.sl_no;
    if (!sl_no || isNaN(sl_no)) {
        res.send("No image found");
        return;
    }
    // Find if the image in institution_bills or site_bills
    const query_result = await db.query("SELECT * FROM institution_bills WHERE sl_no = $1",[sl_no]);
    const query_result_site = await db.query("SELECT * FROM site_bills WHERE sl_no = $1",[sl_no]);
    if (query_result.rows.length === 0 && query_result_site.rows.length === 0) {
        res.send("No image found");
        return;
    }
    // Check if institution user is authorized to view the image
    if (!req.session.isAdmin && !req.session.isDivisionUser && req.session.isInstitutionUser && query_result.rows.length !== 0) {
        const check_owner = await db.query("SELECT institution_id FROM institution_payment_details WHERE sl_no = $1",[sl_no]);
        if (check_owner.rows[0].institution_id !== req.session.user_details?.institution_id) {
            res.send("You are not authorized to view this image");
            return;
        }
    }
    // Check if site user is authorized to view the image
    if (!req.session.isAdmin && !req.session.isDivisionUser && req.session.isSiteUser &&query_result_site.rows.length !== 0) {
        const check_owner = await db.query("SELECT site_id FROM site_payment_details WHERE sl_no = $1",[sl_no]);
        if (check_owner.rows[0].site_id !== req.session.user_details?.site_id) {
            res.send("You are not authorized to view this image");
            return;
        }
    }
    // Check if division user is authorized to view the image for institution
    if (!req.session.isAdmin && req.session.isDivisionUser && query_result.rows.length !== 0) {
        const check_owner = await db.query("SELECT division_id FROM institution_users JOIN institution_payment_details ON institution_users.institution_id=institution_payment_details.institution_id WHERE sl_no = $1",[sl_no]);
        if (check_owner.rows[0].division_id !== req.session.user_details?.division_id) {
            res.send("You are not authorized to view this image");
            return;
        }
    }
    // Check if division user is authorized to view the image for site
    if (!req.session.isAdmin && req.session.isDivisionUser && query_result_site.rows.length !== 0) {
        const check_owner = await db.query("SELECT division_id FROM site_users JOIN site_payment_details ON site_users.site_id=site_payment_details.site_id WHERE sl_no = $1",[sl_no]);
        if (check_owner.rows[0].division_id !== req.session.user_details?.division_id) {
            res.send("You are not authorized to view this image");
            return;
        }
    }

    // Send the image
    if (query_result.rows.length === 0) {
        // This is a site image
        const image = query_result_site.rows[0];
        res.setHeader('Content-Type', image.filetype);
        res.send(image.data);
        return;
    } else {
        // This is an institution image
        const image = query_result.rows[0];
        res.setHeader('Content-Type', image.filetype);
        res.send(image.data);
        return;
    }
});

//handling the get route of generating the comprehensive report by admin
app.get("/comprehensive_report_admin",allowAdmins,async(req,res)=>{
    const institution_payment_details_query_result = await db.query(`SELECT * FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no`);
    const site_payment_details_query_result = await db.query(`SELECT * FROM site_payment_details JOIN site_users ON site_payment_details.site_id = site_users.site_id LEFT JOIN site_bills ON site_payment_details.sl_no = site_bills.sl_no`);
    const institution_payment_details_in_division = institution_payment_details_query_result.rows;
    const site_payment_details_in_division = site_payment_details_query_result.rows;
    res.render("comprehensive_report_admin.ejs",{
        institution_payment_details_in_division,
        site_payment_details_in_division
    });
    return;
});

//handling the get route of generating the local report by admin
app.get("/local_report_admin",allowAdmins,async(req,res)=>{
    const institution_payment_details_query_result = await db.query(`SELECT khatha_or_property_no,institution_name,institution_id,name_of_khathadar,pid FROM institution_users`);
    const site_payment_details_query_result = await db.query(`SELECT khatha_or_property_no,site_name,site_id,name_of_khathadar,pid FROM site_users`);
    const institution_payment_details = institution_payment_details_query_result.rows;
    const site_payment_details = site_payment_details_query_result.rows;
    res.render("local_report_admin.ejs",{
        institution_payment_details : institution_payment_details,
        site_payment_details : site_payment_details
    });
    return;
});

//handling the get route to generate the comprehensive report by divison user
app.get("/comprehensive_report_division",allowDivisionUsers,async(req,res)=>{
    let div_id = req.session.user_details.division_id;
    let division_id = div_id.toUpperCase();
    const division_institution_payment_details_query_result = await db.query("SELECT division_users.division_id,institution_users.institution_id,institution_payment_details.* FROM division_users LEFT JOIN institution_users ON division_users.division_id = institution_users.division_id LEFT JOIN institution_payment_details ON institution_users.institution_id = institution_payment_details.institution_id WHERE division_users.division_id = $1",[division_id]);
    const division_site_payment_details_query_result = await db.query("SELECT division_users.division_id,site_users.site_id,site_payment_details.* FROM division_users LEFT JOIN site_users ON division_users.division_id = site_users.division_id LEFT JOIN site_payment_details ON site_users.site_id = site_payment_details.site_id WHERE division_users.division_id = $1",[division_id]);
    const division_institution_payment_details = division_institution_payment_details_query_result.rows;
    const division_site_payment_details = division_site_payment_details_query_result.rows;
    res.render("comprehensive_report_division.ejs",{
        division_institution_payment_details : division_institution_payment_details,
        division_site_payment_details : division_site_payment_details
    });
    return;
});


//handling the get route to generate the local report by division user
app.get("/local_report_division",allowDivisionUsers,async(req,res)=>{
    let div_id = req.session.user_details.division_id;
    let division_id = div_id.toUpperCase();
    const division_institution_payment_details_query_result = await db.query("SELECT division_users.division_id,institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.name_of_khathadar,institution_users.pid FROM division_users LEFT JOIN institution_users ON division_users.division_id = institution_users.division_id WHERE division_users.division_id = $1",[division_id]);
    const division_site_payment_details_query_result = await db.query("SELECT division_users.division_id,site_users.site_id,site_users.site_name,site_users.khatha_or_property_no,site_users.name_of_khathadar,site_users.pid FROM division_users LEFT JOIN site_users ON division_users.division_id = site_users.division_id WHERE division_users.division_id = $1",[division_id]);
    const division_institution_payment_details = division_institution_payment_details_query_result.rows;
    const division_site_payment_details = division_site_payment_details_query_result.rows;
    res.render("local_report_division.ejs",{
        division_institution_payment_details : division_institution_payment_details,
        division_site_payment_details : division_site_payment_details
    });
    return;
});

//handling the get route to generate the comprehensive report for institution user
app.get("/comprehensive_report_institution",allowInstitutionUsers,async(req,res)=>{
    let ins_id = req.session.user_details.institution_id;
    let institution_id = ins_id.toUpperCase();
    const institution_report_query_result = await db.query("SELECT institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.pid,institution_payment_details.* FROM institution_users LEFT JOIN institution_payment_details ON institution_users.institution_id = institution_payment_details.institution_id WHERE institution_users.institution_id=$1",[institution_id]);
    const comprehensive_institution_report = institution_report_query_result.rows;
    res.render("comprehensive_report_institution.ejs",{
        comprehensive_institution_report : comprehensive_institution_report,
    });
    return;
});

//handling the get route to generate the local report for the institution user
app.get("/local_report_institution",allowInstitutionUsers,async(req,res)=>{
    let ins_id = req.session.user_details.institution_id;
    let institution_id = ins_id.toUpperCase();
    const local_instituion_report_query_result = await db.query(" SELECT institution_id,institution_name,khatha_or_property_no,name_of_khathadar,pid FROM institution_users WHERE institution_id=$1",[institution_id]);
    const local_institution_report = local_instituion_report_query_result.rows;
    res.render("local_report_institution.ejs",{
        local_institution_report : local_institution_report,
    });
    return;
});

//handling the get route to generate the comprehensive report for the site user
app.get("/comprehensive_report_site",allowSiteUsers,async(req,res)=>{
    let s_id = req.session.user_details.site_id;
    let site_id = s_id.toUpperCase();
    const comprehensive_site_report_query_result = await db.query("SELECT site_users.site_id,site_users.site_name,site_users.pid,site_users.khatha_or_property_no,site_payment_details.* FROM site_users LEFT JOIN site_payment_details ON site_users.site_id = site_payment_details.site_id WHERE site_users.site_id=$1",[site_id]);
    const comprehensive_site_report = comprehensive_site_report_query_result.rows;
    res.render("comprehensive_report_site.ejs",{
        comprehensive_site_report : comprehensive_site_report,
    });
    return;
});

//handling the get route to generate the local report for the site user
app.get("/local_report_site",allowSiteUsers,async(req,res)=>{
    let s_id = req.session.user_details.site_id;
    let site_id = s_id.toUpperCase();
    const local_site_report_query_result = await db.query("SELECT site_id,site_name,khatha_or_property_no,name_of_khathadar,pid FROM site_users WHERE site_id=$1",[site_id]);
    const local_site_report = local_site_report_query_result.rows;
    res.render("local_report_site.ejs",{
        local_site_report : local_site_report,
    })
    return;
});

app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});