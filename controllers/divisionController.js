import db from "../db.js";
import { validateEmail } from "../utils/Validation.js";

// Division users' dashboard page
export const getDivisionPage = async(req,res) => {
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
    res.render("division.ejs");
    return;
};

// Getting a list of all institution users under a division for viewing by a division user
export const getListInstitutionUsersInDivisionPage = async(req,res) => {
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
};

//handling the request to modify the institution user details by the division user
export const getModifyInstitutionUsersPage = async(req,res)=>{
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
};

export const postModifyInstitutionUsers = async(req,res)=>{
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
};

//handling the route to delete the institution user by division user
export const getDeleteInstitutionPage = async(req,res)=>{
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
};

// Getting a list of all payment details under a division for viewing by a division user
export const getListPaymentDetailsInDivisionPage = async(req,res) => {
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
};

//code to handle the APPROVE button by the division users approving institution payment details
export const getApproveInstitutionPaymentDetailsPage = async (req, res) => {
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
};

// Create new institution users by division users
// NEEDS MORE RIGOOROUS TESTING
export const getCreateNewInstitutionPage = (req,res)=>{
    res.render("create_new_institution.ejs", 
        {division_id: req.session.user_details.division_id}
    );
    return;
};

export const postCreateNewInstitution = async(req,res)=>{
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
};

//handling the get route to generate the comprehensive report by divison user

export const getComprehensiveReportDivisionPage = async(req,res)=>{
    let division_id = req.session.user_details.division_id;
    const division_institution_payment_details_query_result = await db.query("SELECT division_users.division_id,institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.pid,institution_payment_details.* FROM division_users LEFT JOIN institution_users ON division_users.division_id = institution_users.division_id LEFT JOIN institution_payment_details ON institution_users.institution_id = institution_payment_details.institution_id WHERE division_users.division_id = $1",[division_id]);
    const division_institution_payment_details = division_institution_payment_details_query_result.rows;
    res.render("comprehensive_report_division.ejs",{
        division_institution_payment_details : division_institution_payment_details,
    });
    return;
};

export const getLocalReportDivisionPage = async(req,res)=>{
    let division_id = req.session.user_details.division_id;
    const division_institution_payment_details_query_result = await db.query("SELECT division_users.division_id,institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.name_of_khathadar,institution_users.pid FROM division_users LEFT JOIN institution_users ON division_users.division_id = institution_users.division_id WHERE division_users.division_id = $1",[division_id]);
    const division_institution_payment_details = division_institution_payment_details_query_result.rows;
    res.render("local_report_division.ejs",{
        division_institution_payment_details : division_institution_payment_details,
    });
    return;
};
