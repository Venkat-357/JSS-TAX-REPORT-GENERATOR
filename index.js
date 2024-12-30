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
import { allowAdmins, allowAdminsAndDivisionUsers, allowLoggedIn, allowDivisionUsers, allowInstitutionUsers } from './middleware/restrict_routes.js';
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
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and PDF are allowed!'), false);
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

// Login methods - The same form is used for both admins, division, and institution users
// The login endpoint will automatically log in the user based on the type of user
app.get("/login", (req,res)=>{
    if (req.session.isLoggedIn) {
        res.redirect("/home");
        return;
    } else {
        res.render("login.ejs");
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
    } else {
        req.flash("danger","Was not able to redirect to the correct page");
        res.send("Was not able to redirect to the correct page"); // This is the only blank page in the app
    }
});

// Admin page
app.get("/admin", allowAdmins, (req,res)=>{
    res.render("admin.ejs");
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
        req.flash("danger","The page you are looking for is not available");
        res.redirect("/list_all_division_users");
        return;
    }
    const query_result = await db.query("SELECT * FROM division_users WHERE division_id=$1",[division_identification]);
    const retrieved_info = query_result.rows[0];
    if(!retrieved_info) {
        req.flash("danger","The data you are looking for is not available");
        res.redirect("/list_all_division_users");
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
        req.flash("danger", "Invalid email");
        res.redirect("/modify_division_user?division_id="+division_id);
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (!phone_number || phone_number.length !== 10 || !/^\d+$/.test(phone_number)) {
        req.flash("danger","Invalid phone number, make sure it's 10 digits");
        res.redirect("/modify_division_user?division_id="+division_id);
        return;
    }

    if(isNaN(admin_id)) {
        req.flash("danger","Invalid admin id");
        res.redirect("/modify_division_user?division_id="+division_id);
        return;
    }
    // Check if email, and phone number already exist
    // We have to make sure that the email is unique across all the users, because login depends on the email
    let query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}' AND division_id != '${division_id}'
        UNION SELECT email FROM admins WHERE email = '${email}'
        UNION SELECT email FROM institution_users WHERE email = '${email}'`);
    if(query_result.rows.length !== 0) {
        req.flash("danger","Email already exists");
        res.redirect("/modify_division_user?division_id="+division_id);
        return;
    }
    query_result = await db.query(`SELECT phone_number FROM division_users WHERE phone_number = $1 AND division_id != $2
        UNION SELECT institution_users.phone_number FROM institution_users WHERE phone_number = $1
        `,[phone_number,division_id]);
    if(query_result.rows.length !== 0) {
        req.flash("danger","Phone number already exists");
        res.redirect("/modify_division_user?division_id="+division_id);
        return;
    }

    try {
        await db.query(`UPDATE division_users SET admin_id=$1,division_id=$2,division=$3,email=$4,password=$5,phone_number=$6 WHERE division_id=$7`,[admin_id,division_id,division,email,password,phone_number,division_id]);
        console.log("division user details are updated successfully");
        req.flash("success","Division user details updated successfully");
        res.redirect("/list_all_division_users");
        return;
    } catch (error) {
        req.flash("danger","Failed to update division user details. An error occurred");
        res.redirect("/modify_division_user?division_id="+division_id);
        return;
    }

});

//handling the route to delete the selected division user by admin
app.get("/delete_division_user", allowAdmins, async(req,res)=>{
    const division_identification = req.query['division_id'];
    await db.query("DELETE FROM division_users WHERE division_id=$1",[division_identification]);
    console.log("the division user is deleted successfully");
    req.flash("success","Division user deleted successfully");
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

// Getting a list of all payment details for viewing by admins
app.get("/list_all_payment_details", allowAdmins, async(req,res)=>{
    const selected_year = req.query?.selected_year;
    // TODO: Need to show division details by joining that table here too
    // NOTE: LEFT JOIN TO DISPLAY EVEN IF THE BILL IS NOT UPLOADED
    //dispay the payment details if and only if the current year details are provided else display all the details
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no");
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        res.render("list_all_payment_details.ejs",{
            institution_payment_details_in_division : institution_payment_details_in_division,
            selected_year : selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_payment_details.payment_year = $1",[selected_year]);
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        res.render("list_all_payment_details.ejs",{
            institution_payment_details_in_division : institution_payment_details_in_division,
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
        req.flash("danger","Invalid email");
        res.redirect("/create_new_division");
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (phone_number.length !== 10 || isNaN(phone_number)) {
        req.flash("danger","Invalid phone number");
        res.redirect("/create_new_division");
        return;
    }

    if (isNaN(admin_id)) {
        req.flash("danger","Invalid admin id");
        res.redirect("/create_new_division");
        return;
    }
    // Check if the division id, email, and phone number already exist
    let query_result = await db.query(`SELECT * FROM division_users WHERE division_id = $1`,[division_id]);
    if (query_result.rows.length !== 0) {
        console.log("Division id already exists");
        req.flash("danger","Division id already exists");
        res.redirect("/create_new_division");
        return;
    }
    // We have to make sure that the email is unique across all the users, because login depends on the email
    query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
                                    UNION SELECT email FROM admins WHERE email = '${email}'
                                    UNION SELECT email FROM institution_users WHERE email = '${email}'`);
    if (query_result.rows.length !== 0) {
        console.log("Email already exists");
        req.flash("danger","Email already exists");
        res.redirect("/create_new_division");
        return;
    }
    query_result = await db.query(`SELECT * FROM division_users WHERE phone_number = $1`,[phone_number]);
    if (query_result.rows.length !== 0) {
        console.log("Phone number already exists");
        req.flash("danger","Phone number already exists");
        res.redirect("/create_new_division");
        return;
    }

    try {
        await db.query(`INSERT INTO division_users (admin_id,division_id,division,email,password,phone_number) VALUES($1,$2,$3,$4,$5,$6)`,[admin_id,division_id,division,email,password,phone_number]);
        console.log("new division user is added successfully");
        req.flash("success","New division user added successfully");
        res.redirect("/list_all_division_users");
        return;
    } catch (error) {
        console.log("failed to add a new division user");
        req.flash("danger","Failed to add a new division user");
        res.redirect("/create_new_division");
        return;
    }
});


// Division users' dashboard page
app.get("/division", allowDivisionUsers, async(req,res) => {
    // Get all institution users details who haven't made an entry into the payment details table for the current year
    // This will help the division user to know who hasn't paid yet

    // Get the current year
    const currentYear = new Date().getFullYear();
    // Get the division id
    const division_id = req.session.user_details.division_id;
    // Get the institution users who haven't paid yet
    const institutionUsersQuery = `SELECT institution_id, khatha_or_property_no, phone_number FROM institution_users WHERE division_id = '${division_id}' AND institution_id NOT IN (SELECT institution_id FROM institution_payment_details WHERE payment_year = '${currentYear}')`;
    // Query the database
    const query_result = await db.query(institutionUsersQuery);
    const institutionUsers = query_result.rows;
    if (institutionUsers) {
        req.flash("info", `The users who haven't paid yet are displayed below, please remind them to pay for this year :${currentYear}`);
        if (institutionUsers.length >= 0) {
            req.flash("warning", `Institution users who haven't paid yet:
                ${institutionUsers.map(user => `Institution ID: ${user.institution_id}, Khatha/Property No: ${user.khatha_or_property_no}, Phone Number: ${user.phone_number}`).join('\n')}`);
        }
    }
    res.render("division.ejs",addFlashMessages(req));
    return;
});

// Getting a list of all institution users under a division for viewing by a division user
app.get("/list_institution_users_in_division", allowDivisionUsers, async(req,res) => {
    try {
        const queryResult = await db.query(`SELECT institution_id,institution_users.email,country,state,district,taluk,institution_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building FROM institution_users JOIN division_users ON institution_users.division_id = division_users.division_id WHERE division_users.division_id = '${req.session.user_details.division_id}'`);
        const information = queryResult.rows;
        res.render("list_institution_users_in_division.ejs",{
            information : information,
        });
    } catch (error) {
        console.log("Failed to get institution users");
        req.flash("danger","Failed to get institution users");
        res.redirect("/division");
    }
    return;
});

//handling the request to modify the institution user details by the division user
app.get("/modify_institution_users", allowDivisionUsers, async(req,res)=>{
    try {
        const institution_identification = req.query['institution_id'];
        if (!institution_identification) {
            console.log("The page you are looking for is not available");
            req.flash("warning","The page you are looking for is not available");
            res.redirect("/list_institution_users_in_division");
            return;
        }
        const query_result = await db.query("SELECT * FROM institution_users WHERE institution_id=$1",[institution_identification]);
        const retrieved_info = query_result.rows[0];
        if(!retrieved_info)
        {
            console.log("the data you are requesting for is not available");
            req.flash("danger","The data you are requesting for is not available");
            res.redirect("/list_institution_users_in_division");
            return;
        }
        res.render("modify_institution_users.ejs",{
            retrieved_info : retrieved_info,
        });
        return;
    } catch (error) {
        console.log("Failed to get institution user details");
        req.flash("danger","Failed to get institution user details");
        res.redirect("/list_institution_users_in_division");
    }
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
        console.log("Invalid email");
        req.flash("danger","Invalid email");
        res.redirect("/modify_institution?institution_id="+institution_id);
        return;
    }
    // if (!validatePassword(password)) {
    //     res.send("Invalid password");
    //     return;
    // }
    if (phone_number.length !== 10 || isNaN(phone_number)) {
        console.log("Invalid phone number");
        req.flash("danger","Invalid phone number");
        res.redirect("/modify_institution?institution_id="+institution_id);
        return;
    }
    if ( division_id !== req.session.user_details.division_id) {
        console.log("Invalid division id");
        req.flash("danger","Invalid division id");
        res.redirect("/modify_institution?institution_id="+institution_id);
        return;
    }
    // Check if the email, and phone number already exist
    // We have to make sure that the email is unique across all the users, because login depends on the email
    let query_result = await db.query(`SELECT email FROM division_users WHERE email = '${email}'
                                    UNION SELECT email FROM admins WHERE email = '${email}'
                                    UNION SELECT email FROM institution_users WHERE email = '${email}' AND institution_id != '${institution_id}'
                                    `);
    if (query_result.rows.length !== 0) {
        console.log("Email already exists");
        req.flash("danger","Email already exists");
        res.redirect("/modify_institution?institution_id="+institution_id);
        return;
    }
    query_result = await db.query(`SELECT * FROM institution_users WHERE phone_number = $1 AND institution_id != $2`,[phone_number, institution_id]);
    if (query_result.rows.length !== 0) {
        console.log("Phone number already exists");
        req.flash("danger","Phone number already exists");
        res.redirect("/modify_institution?institution_id="+institution_id);
        return;
    }
    try {
        await db.query(`UPDATE institution_users SET division_id=$1,email=$2,password=$3,phone_number=$4,institution_id=$5,country=$6,state=$7,district=$8,taluk=$9,institution_name=$10,village_or_city=$11,pid=$12,khatha_or_property_no=$13,name_of_khathadar=$14,type_of_building=$15 WHERE institution_id=$16`,[division_id,email,password,phone_number,institution_id,country,state,district,taluk,institution_name,village,pid,khatha_no,khathadar_name,building_type,institution_id]);
        console.log("modified institution user details are added successfully");
        req.flash("success","Institution user details modified successfully");
        res.redirect("/list_institution_users_in_division");
        return;
    } catch (error) {
        console.log("failed to add a modified institution user details");
        req.flash("danger","Failed to modify institution user details");
        res.redirect("/modify_institution_users");
        return;
    }
});

//handling the route to delete the institution user by division user
app.get("/delete_institution", allowDivisionUsers ,async(req,res)=>{
    try {
        const institution_identification = req.query['institution_id'];
        if (!institution_identification) {
            req.flash("warning","The page you are looking for is not available");
            res.redirect("/list_institution_users_in_division");
            return;
        }
        let query_result = await db.query("SELECT * FROM institution_users WHERE institution_id=$1",[institution_identification]);
        if (query_result.rows.length === 0) {
            req.flash("warning","The data you are looking for is not available");
            res.redirect("/list_institution_users_in_division");
            return;
        }
        if (query_result.rows[0].division_id !== req.session.user_details.division_id) {
            req.flash("danger","You are not authorized to delete this institution user");
            res.redirect("/list_institution_users_in_division");
            return;
        }
        await db.query("DELETE FROM institution_users WHERE institution_id = $1",[institution_identification]);
        console.log("the institution user is deleted successfully");
        req.flash("success","Institution user deleted successfully");
        res.redirect("/list_institution_users_in_division");
    } catch (error) {
        console.log("Failed to delete institution user");
        req.flash("danger","Failed to delete institution user");
        res.redirect("/list_institution_users_in_division");
    }
    return;
});

// Getting a list of all payment details under a division for viewing by a division user
app.get("/list_payment_details_in_division", allowDivisionUsers, async(req,res) => {
    const selected_year = req.query?.selected_year;
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query(`SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.division_id = '${req.session.user_details.division_id}'`);
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        res.render("list_payment_details_in_division.ejs",{
            institution_payment_details_in_division,
            selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.division_id = $1 AND institution_payment_details.payment_year=$2",[req.session.user_details.division_id,selected_year]);
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        res.render("list_payment_details_in_division.ejs",{
            institution_payment_details_in_division,
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
        if (!sl_no || isNaN(sl_no)) {
            req.flash("danger","Invalid request.");
            res.redirect("/list_payment_details_in_division");
            return;
        }
        // Check if institution is under the division user
        const institutionCheck = await db.query("SELECT * FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id WHERE institution_payment_details.sl_no = $1 AND institution_users.division_id = $2", [sl_no, req.session.user_details.division_id]);
        if (institutionCheck.rowCount === 0) {
            req.flash("danger","Not authorized");
            res.redirect("/list_payment_details_in_division");
            return;
        }

        // Check if the record exists
        const recordCheck = await db.query("SELECT * FROM institution_payment_details WHERE sl_no = $1", [sl_no]);
        if (recordCheck.rowCount === 0) {
            req.flash("danger","Payment details not found");
            res.redirect("/list_payment_details_in_division");
            return;
        }

        // Approve the payment
        await db.query("UPDATE institution_payment_details SET approval_status = true WHERE sl_no = $1", [sl_no]);
        console.log(`Payment details with sl_no ${sl_no} approved successfully.`);
        req.flash("success","Payment details approved successfully");
        res.redirect("/list_payment_details_in_division");
        return;
    } catch (error) {
        console.error("Error approving payment details:", error);
        req.flash("danger","An error occurred while approving payment details");
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
                                    UNION SELECT email FROM institution_users WHERE email = '${email}'`);
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

//handling the /institution route and displaying the home page of institution users
app.get("/institution",allowInstitutionUsers,(req,res)=>{
    res.render("institution.ejs");
    return;
});

//handling the /list_payment_details_in_institution route to display all the institution payment details  
app.get("/list_payment_details_in_institution", allowInstitutionUsers, async(req,res)=>{
    const selected_year = req.query?.selected_year;
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name  FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.institution_id = $1",[req.session.user_details.institution_id]);
        const information = institution_payment_details_query_result.rows;
        res.render("list_payment_details_in_institution.ejs",{
            information : information,
            selected_year : selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_users.institution_id = $1 AND institution_payment_details.payment_year = $2",[req.session.user_details.institution_id,selected_year]);
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
    const usage_of_building = req.body[`usage-of-building`];
    const department_paid = req.body[`department-paid`];
    const cesses = req.body.cesses;
    const interest = req.body.interest;
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    const no_of_floors = req.body[`no-of-floors`];
    const basement_floor = req.body[`basement-floor-in-sqft`];
    const ground_floor = req.body[`ground-floor-in-sqft`];
    const first_floor = req.body[`first-floor-in-sqft`];
    const second_floor = req.body[`second-floor-in-sqft`];
    const third_floor = req.body[`third-floor-in-sqft`];
    // Pre checks:
    try {
        // Make sure that the year isn't already present
        const yearCheck = await db.query("SELECT * FROM institution_payment_details WHERE payment_year = $1 AND institution_id = $2", [payment_year, institution_id]);
        if (yearCheck.rowCount !== 0) {
            console.log("Year already exists");
            req.flash("danger","Year already exists");
            res.redirect("/new_institution_payment_details");
            return;
        }
        // Make sure the receipt number isn't already present
        const receiptCheck = await db.query("SELECT * FROM institution_payment_details WHERE receipt_no_or_date = $1 AND institution_id = $2", [receipt_no, institution_id]);
        if (receiptCheck.rowCount !== 0) {
            console.log("Receipt number already exists");
            req.flash("danger","Receipt number already exists");
            res.redirect("/new_institution_payment_details");
            return;
        }
    } catch (error) {
        console.error("Error checking for existing year or receipt number:", error);
        req.flash("danger","An error occurred while doing preliminary checks and the payment details could not be added. Please contact the administrator.");
        res.redirect("/new_institution_payment_details");
        return;
    }


    // Insert the payment details
    try {
            let sl_no = await db.query("INSERT INTO institution_payment_details (institution_id,payment_year,receipt_no_or_date,property_tax,rebate,service_tax,dimension_of_vacant_area_sqft,dimension_of_building_area_sqft,total_dimension_in_sqft,usage_of_building,to_which_department_paid,cesses,interest,total_amount,remarks,number_of_floors,basement_floor_sqft,ground_floor_sqft,first_floor_sqft,second_floor_sqft,third_floor_sqft) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING sl_no",[institution_id,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,usage_of_building,department_paid,cesses,interest,total_amount,remarks,no_of_floors,basement_floor,ground_floor,first_floor,second_floor,third_floor]);
            if(req.file) {
                const fileBuffer = req.file.buffer;
                const fileType = req.file.mimetype;
                const fileName = req.file.originalname;
                //insert the image into database
                await db.query(`INSERT INTO institution_bills (sl_no,fileName,filetype,data) VALUES (${sl_no.rows[0].sl_no},$1,$2,$3)`,[fileName,fileType,fileBuffer]);
            }
            console.log("new institution payment details are added successfully");
            req.flash("success","New institution payment details added successfully");
            res.redirect("/list_payment_details_in_institution");
            return;
        } catch (error) {
            console.log("failed to add the new institution payment details");
            console.log(error);
            req.flash("danger","Failed to add new institution payment details. An error occurred.");
            res.redirect("/new_institution_payment_details");
            return;
        }
});

//handling the route to modify the institution payment details by the respective institution user
app.get("/modify_institution_payment_details", allowInstitutionUsers, async(req,res)=>{
    const sl_no = req.query['sl_no'];
    if (!sl_no) {
        console.log("The page you are looking for is not available");
        req.flash("warning","The page you are looking for is not available");
        res.redirect("/list_payment_details_in_institution");
        return;
    }
    const query_result = await db.query("SELECT * FROM institution_payment_details WHERE sl_no=$1",[sl_no]);
    const retrieved_info = query_result.rows[0];
    if(!retrieved_info)
    {
        console.log("the data you are looking for is not available");
        req.flash("danger","The data you are looking for is not available");
        res.redirect("/list_payment_details_in_institution");
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
    const usage_of_building = req.body[`usage-of-building`];
    const department_paid = req.body[`department-paid`];
    const cesses = req.body.cesses;
    const interest = req.body.interest;
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    const no_of_floors = req.body[`no-of-floors`];
    const basement_floor = req.body[`basement-floor-in-sqft`];
    const ground_floor = req.body[`ground-floor-in-sqft`];
    const first_floor = req.body[`first-floor-in-sqft`];
    const second_floor = req.body[`second-floor-in-sqft`];
    const third_floor = req.body[`third-floor-in-sqft`];
    try {
        let sl_no = await db.query("UPDATE institution_payment_details SET institution_id=$1,payment_year=$2,receipt_no_or_date=$3,property_tax=$4,rebate=$5,service_tax=$6,dimension_of_vacant_area_sqft=$7,dimension_of_building_area_sqft=$8,total_dimension_in_sqft=$9,usage_of_building=$10,to_which_department_paid=$11,cesses=$12,interest=$13,total_amount=$14,remarks=$15,number_of_floors=$16,basement_floor_sqft=$17,ground_floor_sqft=$18,first_floor_sqft=$19,second_floor_sqft=$20,third_floor_sqft=$21 WHERE institution_id=$22 RETURNING sl_no",[institution_id,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,usage_of_building,department_paid,cesses,interest,total_amount,remarks,no_of_floors,basement_floor,ground_floor,first_floor,second_floor,third_floor,institution_id]);
        if(req.file) {
            const fileBuffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const fileName = req.file.originalname;
            //insert the image into database
            await db.query("UPDATE institution_bills SET sl_no=$1,data=$2,fileType=$3,fileName=$4",[sl_no.rows[0].sl_no,fileBuffer,fileType,fileName]);
            }
            console.log("modified institution payment details are added successfully");
            req.flash("success","Institution payment details modified successfully");
            res.redirect("/list_payment_details_in_institution");
            return;
    } catch (error) {
        console.log("failed to add the modified institution payment details");
        console.log(error);
        req.flash("danger","Failed to modify institution payment details. An error occurred");
        res.redirect("/modify_institution_payment_details");
        return;
    }
});

//handling the route to delete the payment details of institution users
app.get("/delete_payment_details", allowInstitutionUsers, async(req,res)=>{
    const sl_no = req.query['sl_no'];
    if (!sl_no) {
        console.log("The page you are looking for is not available");
        req.flash("warning","The page you are looking for is not available");
        res.redirect("/list_payment_details_in_institution");
        return;
    }
    // Make sure the institution user is the owner of the payment details
    const institutionCheck = await db.query("SELECT * FROM institution_payment_details WHERE sl_no = $1 AND institution_id = $2", [sl_no, req.session.user_details.institution_id]);
    if (institutionCheck.rowCount === 0) {
        console.log("Not authorized");
        req.flash("danger","Not authorized");
        res.redirect("/list_payment_details_in_institution");
        return;
    }
    await db.query("DELETE FROM institution_payment_details WHERE sl_no=$1",[sl_no]);
    console.log("the institution payment details are deleted successfully");
    req.flash("success","Institution payment details deleted successfully");
    res.redirect('/list_payment_details_in_institution');
    return;
});

// View images
app.get("/view_image/:sl_no", allowLoggedIn, async(req,res)=>{
    const sl_no = req.params.sl_no;
    if (!sl_no || isNaN(sl_no)) {
        req.flash("danger","Invalid request");
        res.redirect("/home");
        return;
    }
    // Find if the image is in institution_bills
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

//handling the get route of generating the comprehensive report by admin
app.get("/comprehensive_report_admin",allowAdmins,async(req,res)=>{
    try {
        const institution_payment_details_query_result = await db.query(`SELECT * FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no`);
        const institution_payment_details_in_division = institution_payment_details_query_result.rows;
        res.render("comprehensive_report_admin.ejs",{
            institution_payment_details_in_division,
        });
    } catch (error) {
        console.log("Failed to generate comprehensive report");
        console.log(error);
        req.flash("danger","Failed to generate comprehensive report");
        res.redirect("/home");
    }
    return;
});

//handling the get route of generating the local report by admin
app.get("/local_report_admin",allowAdmins,async(req,res)=>{
    try {
        const institution_payment_details_query_result = await db.query(`SELECT khatha_or_property_no,institution_name,institution_id,name_of_khathadar,pid FROM institution_users`);
        const institution_payment_details = institution_payment_details_query_result.rows;
        res.render("local_report_admin.ejs",{
            institution_payment_details : institution_payment_details,
        });
    } catch (error) {
        console.log("Failed to generate local report");
        console.log(error);
        req.flash("danger","Failed to generate local report");
        res.redirect("/home");
    }
    return;
});

//handling the get route to generate the comprehensive report by divison user

app.get("/comprehensive_report_division",allowDivisionUsers,async(req,res)=>{
    let division_id = req.session.user_details.division_id;
    const division_institution_payment_details_query_result = await db.query("SELECT division_users.division_id,institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.pid,institution_payment_details.* FROM division_users LEFT JOIN institution_users ON division_users.division_id = institution_users.division_id LEFT JOIN institution_payment_details ON institution_users.institution_id = institution_payment_details.institution_id WHERE division_users.division_id = $1",[division_id]);
    const division_institution_payment_details = division_institution_payment_details_query_result.rows;
    res.render("comprehensive_report_division.ejs",{
        division_institution_payment_details : division_institution_payment_details,
    });
    return;
});



app.get("/local_report_division",allowDivisionUsers,async(req,res)=>{
    let division_id = req.session.user_details.division_id;
    const division_institution_payment_details_query_result = await db.query("SELECT division_users.division_id,institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.name_of_khathadar,institution_users.pid FROM division_users LEFT JOIN institution_users ON division_users.division_id = institution_users.division_id WHERE division_users.division_id = $1",[division_id]);
    const division_institution_payment_details = division_institution_payment_details_query_result.rows;
    res.render("local_report_division.ejs",{
        division_institution_payment_details : division_institution_payment_details,
    });
    return;
});

//handling the get route to generate the comprehensive report for institution user
app.get("/comprehensive_report_institution",allowInstitutionUsers,async(req,res)=>{
    let institution_id = req.session.user_details.institution_id;
    const institution_report_query_result = await db.query("SELECT institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.pid,institution_payment_details.* FROM institution_users LEFT JOIN institution_payment_details ON institution_users.institution_id = institution_payment_details.institution_id WHERE institution_users.institution_id=$1",[institution_id]);
    const comprehensive_institution_report = institution_report_query_result.rows;
    res.render("comprehensive_report_institution.ejs",{
        comprehensive_institution_report : comprehensive_institution_report,
    });
    return;
});

//handling the get route to generate the local report for the institution user
app.get("/local_report_institution",allowInstitutionUsers,async(req,res)=>{
    let institution_id = req.session.user_details.institution_id;
    const local_instituion_report_query_result = await db.query(" SELECT institution_id,institution_name,khatha_or_property_no,name_of_khathadar,pid FROM institution_users WHERE institution_id=$1",[institution_id]);
    const local_institution_report = local_instituion_report_query_result.rows;
    res.render("local_report_institution.ejs",{
        local_institution_report : local_institution_report,
    });
    return;
});

app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});