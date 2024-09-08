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
        return;
    } else {
        res.render("login.ejs");
        return;
    }
});
import { login, logout } from './controllers/auth.js';
import { render } from 'ejs';
app.post("/login", async (req,res)=> login(req,res,db));

app.get("/logout", async(req,res)=> logout(req,res));

// Main page - Will route to a different view based on the type of user
/* app.get("/home", async(req,res) => {
    if (!req.session.isLoggedIn) {
        res.redirect("/login");
        return;
    }
    // Redirect to the correct page based on the type of user
    if (req.session.isAdmin) {
        res.redirect("/admin_options");
    } else if (req.session.isDivisionUser) {
        res.redirect("/institutions");
    } else if (req.session.isInstitutionUser) {
        res.redirect("/institution");
    } else if (req.session.isSiteUser) {
        res.redirect("/site");
    } else {
        res.send("Was not able to redirect to the correct page");
    }
}); */
// Admin options
app.get("/admin_options",(req,res)=>{
    res.render("admin_options.ejs");
    return;
});

app.get("/home",(req,res)=>{
    res.render("login.ejs");
});

// Admin page
app.get("/admindiv", async(req,res) => {
    if (!req.session.isLoggedIn || !req.session.isAdmin) {
        res.redirect("/login");
        return;
    }
    const queryResult = await db.query("SELECT * FROM division_users");
    const information = queryResult.rows;
    res.render("admindiv.ejs",{
        information : information,
    });
    return;
});

app.get("/adminins", async(req,res) => {
    if (!req.session.isLoggedIn || !req.session.isAdmin) {
        res.redirect("/login");
        return;
    }
    const query_result = await db.query("SELECT * FROM institution_users");
    const information = query_result.rows;
    res.render("adminins.ejs",{
        information : information,
    });
    return;
});

app.get("/adminsite",async(req,res)=>{
    if(!req.session.isLoggedIn || !req.session.isAdmin) {
        res.redirect("/login");
        return ;
    }
    const query_result = await db.query("SELECT * FROM site_users");
    const information = query_result.rows;
    res.render("adminsite.ejs",{
        information : information,
    });
    return;
});

app.get("/adminpay",async(req,res)=>{
    if(!req.session.isLoggedIn || !req.session.isAdmin) {
        res.redirect("/login");
        return ;
    }
    const query_result = await db.query("SELECT * FROM payment_details JOIN bills ON payment_details.sl_no = bills.sl_no");
    const information = query_result.rows;
    res.render("adminpay.ejs",{
        information : information,
    });
    return;
});

// Division users page to show institutions
app.get("/institutions", async(req,res) => {
    if (!req.session.isLoggedIn || !req.session.isDivisionUser) {
        res.redirect("/login");
        return;
    }
    const query_result = await db.query("SELECT * FROM institution_users");
    const information = query_result.rows;
    res.render("institutions.ejs",{
        information : information,
    });
    return;
});

// Division users page to show sites
app.get("/sites",async(req,res)=>{
    if(!req.session.isLoggedIn || !req.session.isDivisionUser) {
        res.redirect("/login");
        return ;
    }
    const query_result = await db.query("SELECT * FROM site_users");
    const information = query_result.rows;
    res.render("sites.ejs",{
        information : information,
    });
    return;
});

// site or institutions users page to show payment details
app.get("/payment_details",async(req,res)=>{
    if(!req.session.isLoggedIn || !req.session.isInstitutionUser || !req.session.isSiteUser) {
        res.redirect("/login");
        return ;
    }
    const query_result = await db.query("SELECT * FROM payment_details JOIN bills ON payment_details.sl_no = bills.sl_no");
    const information = query_result.rows;
    res.render("payment_details.ejs",{
        information : information,
    });
    return;
});

//to add new divison user by admin
app.get("/newdiv",async(req,res)=>{
    if(!req.session.isAdmin)
    {
        res.send("you are not permitted to add new division user");
        return;
    }
    res.render("new_division_users.ejs");
    return;
});

app.post("/newdiv",async(req,res)=>{
    const division_id = req.body[`division-id`];
    const division = req.body.division;
    const email = req.body.email;
    const password = req.body.password;
    const phone_number = req.body.phone;
    try {
        await db.query(`INSERT INTO division_users (division_id,division,email,password,phone_number) VALUES($1,$2,$3,$4,$5)`,[division_id,division,email,password,phone_number]);
        console.log("new division user is added successfully");
        res.redirect("/admin");
        return;
    } catch (error) {
        console.log("failed to add a new division user");
        console.log(error);
        res.redirect("/newdiv");
        return;
    }
});


//to add new institution user by division user
app.get("/newins",(req,res)=>{
    if(!req.session.isDivisionUser)
    {
        res.send("you are not permitted to add a new institution user");
        return;
    }
    res.render("new_institution_user.ejs");
    return;
});

app.post("/newins",async(req,res)=>{
    const division_id = req.body[`divison-id`];
    const email = req.body.email;
    const password = req.body.password;
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

    try {
        await db.query("INSERT INTO institution_users (division_id,email,password,institution_id,country,state,district,taluk,institution_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",[division_id,email,password,institution_id,country,state,district,taluk,institution_name,village,pid,khatha_no,khathadar_name,building_type]);
        console.log("new institution user is added successfully");
        res.redirect("/institutions");
        return;
    } catch (error) {
        console.log("failed to add a new institution user");
        console.log(error);
        res.redirect("/newins");
        return;
    }
});


//to add new site users by division users
app.get("/newsite",(req,res)=>{
    if(!req.session.isDivisionUser)
    {
        res.send("you are not permitted to add a new institution user");
        return;
    }
    res.render("new_site_users.ejs");
    return;
});

app.post("/newsite",async(req,res)=>{
    const division_id = req.body[`divison-id`];
    const email = req.body.email;
    const password = req.body.password;
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

    try {
        await db.query("INSERT INTO site_users (division_id,email,password,site_id,country,state,district,taluk,site_name,village_or_city,pid,khatha_or_property_no,name_of_khathadar,type_of_building) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",[division_id,email,password,site_id,country,state,district,taluk,site_name,village,pid,khatha_no,khathadar_name,building_type]);
        console.log("new site user is added successfully");
        res.redirect("/sites");
        return;
    } catch (error) {
        console.log("failed to add a new institution user");
        console.log(error);
        res.redirect("/newsite");
        return;
    }
});

//to add new payment details by institution users or site users
app.get("/newpay",(req,res)=>{
    if(!req.session.isInstitutionUser || !req.session.isSiteUser)
    {
        res.send("you are not permitted to add a new payment details");
        return;
    }
    res.render("new_payment_details.ejs");
    return;
});

app.post("/newpay",async(req,res)=>{
    const institution_id = req.body[`institution-id`];
    const site_id = req.body[`site-id`];
    const assessment_year = req.body[`assessment-year`];
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
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;

    try {
        let s_no = await db.query("INSERT INTO payment_details (institution_id,site_id,assessment_year,payment_year,receipt_no_or_date,property_tax,rebate,service_tax,dimension_of_vacant_area_sqft,dimension_of_building_area_sqft,total_dimension_in_sqft,to_which_department_paid,cesses,interest,total_amount,remarks RETURNING s_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",[institution_id,site_id,assessment_year,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,department_paid,cesses,total_amount,remarks])
        if(req.file) {
            const fileBuffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const fileName = req.file.originalname;
            //insert the image into database
            await db.query(`INSERT INTO bills (s_no,data,fileType,fileName) VALUES (${s_no.rows[0].s_no},$1,$2,$3)`,[fileBuffer,fileType,fileName]);
        }
        console.log("new payment details are added successfully");
        res.redirect("/payment_details");
        return;
    } catch (error) {
        console.log("failed to add the new payment details");
        console.log(error);
        res.redirect("/newpay");
        return;
    }
});

app.listen(port,()=>{
    console.log(`server is listening at the port ${port}`);
});