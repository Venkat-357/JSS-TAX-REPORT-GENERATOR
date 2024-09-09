import express, { query } from 'express';
import pg from 'pg';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
dotenv.config(); // Load the environment variables from the .env file
import { exit } from 'process';
import createTablesIfNotExists from './utils/create_tables.js';
import {setAuthStatus} from './middleware/auth_wrap.js';
import { allowAdmins, allowAdminsAndDivisionUsers, allowLoggedIn, allowDivisionUsers } from './middleware/restrict_routes.js';
import { validateEmail, validatePassword } from './utils/Validation.js';

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
app.use(setAuthStatus);

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
    } else if (req.session.isSiteUser) {
        res.redirect("/site");
    } else {
        res.send("Was not able to redirect to the correct page");
    }
});

// Admin page
app.get("/admin", allowAdmins, (req,res)=>{
    res.render("admin.ejs");
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
    const query_result = await db.query("SELECT * FROM payment_details JOIN bills ON payment_details.sl_no = bills.sl_no");
    const information = query_result.rows;
    res.render("list_all_payment_details.ejs",{
        information : information,
    });
    return;
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
    if (isNaN(division_id)) {
        res.send("Invalid division id");
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
        res.redirect("/admin");
        return;
    } catch (error) {
        console.log("failed to add a new division user");
        res.send(error)
        return;
    }
});


// Division users' dashboard page
app.get("/division", allowDivisionUsers, (req,res) => {
    res.render("division.ejs");
    return;
});

// // site or institutions users page to show payment details
// app.get("/payment_details",async(req,res)=>{
//     if(!req.session.isLoggedIn || !req.session.isInstitutionUser || !req.session.isSiteUser) {
//         res.redirect("/login");
//         return ;
//     }
//     const query_result = await db.query("SELECT * FROM payment_details JOIN bills ON payment_details.sl_no = bills.sl_no");
//     const information = query_result.rows;
//     res.render("payment_details.ejs",{
//         information : information,
//     });
//     return;
// });



// //to add new institution user by division user
// app.get("/newins",(req,res)=>{
//     if(!req.session.isDivisionUser)
//     {
//         res.send("you are not permitted to add a new institution user");
//         return;
//     }
//     res.render("new_institution_user.ejs");
//     return;
// });

// app.post("/newins",async(req,res)=>{
//     const division_id = req.body[`divison-id`];
//     const email = req.body.email;
//     const password = req.body.password;
//     const institution_id = req.body[`institution-id`];
//     const country = req.body.country;
//     const state = req.body.state;
//     const district = req.body.district;
//     const taluk = req.body.taluk;
//     const institution_name = req.body[`institution-name`];
//     const village = req.body.village;
//     const pid = req.body.pid;
//     const khatha_no = req.body[`khatha-no`];
//     const khathadar_name = req.body[`khathadar-name`];
//     const building_type = req.body[`type-of-building`];

//     try {
//         await db.query("INSERT INTO institution_users (division_id,email,password,institution_id,country,state,district,taluk,institution_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",[division_id,email,password,institution_id,country,state,district,taluk,institution_name,village,pid,khatha_no,khathadar_name,building_type]);
//         console.log("new institution user is added successfully");
//         res.redirect("/institutions");
//         return;
//     } catch (error) {
//         console.log("failed to add a new institution user");
//         console.log(error);
//         res.redirect("/newins");
//         return;
//     }
// });


// //to add new site users by division users
// app.get("/newsite",(req,res)=>{
//     if(!req.session.isDivisionUser)
//     {
//         res.send("you are not permitted to add a new institution user");
//         return;
//     }
//     res.render("new_site_users.ejs");
//     return;
// });

// app.post("/newsite",async(req,res)=>{
//     const division_id = req.body[`divison-id`];
//     const email = req.body.email;
//     const password = req.body.password;
//     const site_id = req.body[`site-id`];
//     const country = req.body.country;
//     const state = req.body.state;
//     const district = req.body.district;
//     const taluk = req.body.taluk;
//     const site_name = req.body[`site-name`];
//     const village = req.body.village;
//     const pid = req.body.pid;
//     const khatha_no = req.body[`khatha-no`];
//     const khathadar_name = req.body[`khathadar-name`];
//     const building_type = req.body[`type-of-building`];

//     try {
//         await db.query("INSERT INTO site_users (division_id,email,password,site_id,country,state,district,taluk,site_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",[division_id,email,password,site_id,country,state,district,taluk,site_name,village,pid,khatha_no,khathadar_name,building_type]);
//         console.log("new site user is added successfully");
//         res.redirect("/sites");
//         return;
//     } catch (error) {
//         console.log("failed to add a new institution user");
//         console.log(error);
//         res.redirect("/newsite");
//         return;
//     }
// });

// //to add new payment details by institution users or site users
// app.get("/newpay",(req,res)=>{
//     if(!req.session.isInstitutionUser || !req.session.isSiteUser)
//     {
//         res.send("you are not permitted to add a new payment details");
//         return;
//     }
//     res.render("new_payment_details.ejs");
//     return;
// });

// app.post("/newpay",async(req,res)=>{
//     const institution_id = req.body[`institution-id`];
//     const site_id = req.body[`site-id`];
//     const assessment_year = req.body[`assessment-year`];
//     const payment_year = req.body[`payment-year`];
//     const receipt_no = req.body['receipt-no'];
//     const property_tax = req.body[`property-tax`];
//     const rebate = req.body.rebate;
//     const service_tax = req.body[`service-tax`];
//     const dimension_of_vacant_area = req.body[`dimension-of-vacant-area-in-sqft`];
//     const dimension_of_building_area = req.body[`dimension-of-building-area-in-sqft`];
//     const total_dimension = req.body[`total-dimension`];
//     const department_paid = req.body[`department-paid`];
//     const cesses = req.body.cesses;
//     const total_amount = req.body[`total-amount`];
//     const remarks = req.body.remarks;

//     try {
//         let s_no = await db.query("INSERT INTO payment_details (institution_id,site_id,assessment_year,payment_year,receipt_no_or_date,property_tax,rebate,service_tax,dimension_of_vacant_area_sqft,dimension_of_building_area_sqft,total_dimension_in_sqft,to_which_department_paid,cesses,interest,total_amount,remarks RETURNING s_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",[institution_id,site_id,assessment_year,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,department_paid,cesses,total_amount,remarks])
//         if(req.file) {
//             const fileBuffer = req.file.buffer;
//             const fileType = req.file.mimetype;
//             const fileName = req.file.originalname;
//             //insert the image into database
//             await db.query(`INSERT INTO bills (s_no,data,fileType,fileName) VALUES (${s_no.rows[0].s_no},$1,$2,$3)`,[fileBuffer,fileType,fileName]);
//         }
//         console.log("new payment details are added successfully");
//         res.redirect("/payment_details");
//         return;
//     } catch (error) {
//         console.log("failed to add the new payment details");
//         console.log(error);
//         res.redirect("/newpay");
//         return;
//     }
// });

app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});