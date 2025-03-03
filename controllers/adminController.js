import  db  from "../db.js";
import { validateEmail } from "../utils/Validation.js";

export const getAdminPage = (req,res) =>{
    res.render("admin.ejs");
    return;
}

// Getting a list of all division users for viewing by admins
export const getlistAllDivisionUsersPage = async(req,res) => {
    const queryResult = await db.query("SELECT * FROM division_users");
    const information = queryResult.rows;
    res.render("list_all_division_users.ejs",{
        information : information,
    });
    return;
};

//handling the modify option to modify the division users details by the admin
export const getModifyDivisionUserPage = async(req,res)=>{
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
};

export const postModifyDivisionUser = async(req,res)=>{
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

};

//handling the route to delete the selected division user by admin
export const getDeleteDivisionUserPage = async(req,res)=>{
    const division_identification = req.query['division_id'];
    await db.query("DELETE FROM division_users WHERE division_id=$1",[division_identification]);
    console.log("the division user is deleted successfully");
    req.flash("success","Division user deleted successfully");
    res.redirect("/list_all_division_users");
    return;
};

// Getting a list of all institution users for viewing by admins
export const getAllInstitutionUsersPage = async(req,res) => {
    const query_result = await db.query("SELECT * FROM institution_users");
    const information = query_result.rows;
    res.render("list_all_institution_users.ejs",{
        information : information,
    });
    return;
};

// Getting a list of all payment details for viewing by admins
export const getAllPaymentDetailsPage = async(req,res)=>{
    const selected_year = req.query?.selected_year;
    // TODO: Need to show division details by joining that table here too
    // NOTE: LEFT JOIN TO DISPLAY EVEN IF THE BILL IS NOT UPLOADED
    //dispay the payment details if and only if the current year details are provided else display all the details
    if(!selected_year) {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no");
        const institution_payment_details = institution_payment_details_query_result.rows;
        const admin_payment_details_query_result = await db.query("SELECT admin_payment_details.*, admin_bills.sl_no AS bill_sl_no FROM admin_payment_details LEFT JOIN admin_bills ON admin_payment_details.sl_no = admin_bills.sl_no");
        const admin_payment_details = admin_payment_details_query_result.rows;
        res.render("list_all_payment_details.ejs",{
            institution_payment_details : institution_payment_details,
            admin_payment_details : admin_payment_details,
            selected_year : selected_year,
        });
        return;
    } else {
        const institution_payment_details_query_result = await db.query("SELECT institution_payment_details.*, institution_bills.sl_no AS bill_sl_no, institution_users.institution_name FROM institution_payment_details JOIN institution_users ON institution_payment_details.institution_id = institution_users.institution_id LEFT JOIN institution_bills ON institution_payment_details.sl_no = institution_bills.sl_no WHERE institution_payment_details.payment_year = $1",[selected_year]);
        const institution_payment_details = institution_payment_details_query_result.rows;
        const admin_payment_details_query_result = await db.query("SELECT admin_payment_details.*, admin_bills.sl_no AS bill_sl_no FROM admin_payment_details LEFT JOIN admin_bills ON admin_payment_details.sl_no = admin_bills.sl_no WHERE admin_payment_details.payment_year = $1",[selected_year]);
        const admin_payment_details = admin_payment_details_query_result.rows;
        res.render("list_all_payment_details.ejs",{
            institution_payment_details : institution_payment_details,
            admin_payment_details : admin_payment_details,
            selected_year : selected_year,
        });
        return;
    }
};

// Creating a new divison/user by admins
export const getCreateNewDivisionPage = async(req,res) => {
    res.render("create_new_division.ejs");
    return;
};

export const postCreateNewDivision = async(req,res) => {
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
};

// Allowing admins to temporarily add payment details under a secret 'admin' division and institution to later transfer them to institutions when they are added
export const getNewAdminPaymentDetailsPage = (req,res)=>{
    res.render("new_admin_payment_details.ejs");
    return;
};

export const postNewAdminPaymentDetails = async(req,res)=>{
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
    const penalty_arrears = req.body[`penalty-arrears`];
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    const no_of_floors = req.body[`number_of_floors`];
    const basement_floor = req.body[`basement-floor-in-sqft`];
    const ground_floor = req.body[`ground-floor-in-sqft`];
    const first_floor = req.body[`first-floor-in-sqft`];
    const second_floor = req.body[`second-floor-in-sqft`];
    const third_floor = req.body[`third-floor-in-sqft`];
    const property_name = req.body[`property-name`]
    const country = req.body.country;
    const state = req.body.state;
    const district = req.body.district;
    const taluk = req.body.taluk;
    const village_or_city = req.body['village'];
    const pid = req.body.pid;
    const khatha_or_property_no = req.body['khatha-no'];
    const name_of_khathadar = req.body['khathadar-name'];
    const type_of_building = req.body['type-of-building'];
    // Pre checks:
    try {
        // Make sure the receipt number isn't already present
        const receiptCheck = await db.query("SELECT sl_no FROM institution_payment_details WHERE receipt_no_or_date = $1 UNION SELECT sl_no FROM admin_payment_details WHERE receipt_no_or_date = $1", [receipt_no]);
        if (receiptCheck.rowCount !== 0) {
            console.log("Receipt number already exists");
            req.flash("danger","Receipt number already exists");
            res.redirect("/new_admin_payment_details");
            return;
        }
    } catch (error) {
        console.error("Error checking for existing year or receipt number:", error);
        req.flash("danger","An error occurred while doing preliminary checks and the payment details could not be added. Please contact the administrator.");
        res.redirect("/new_admin_payment_details");
        return;
    }

    // Insert the payment details
    try {
            let sl_no = await db.query(
                `INSERT INTO admin_payment_details (
                    payment_year, 
                    receipt_no_or_date,
                    property_tax,
                    rebate,
                    service_tax,
                    dimension_of_vacant_area_sqft,
                    dimension_of_building_area_sqft, 
                    total_dimension_in_sqft,
                    usage_of_building,
                    to_which_department_paid,
                    cesses,
                    interest,
                    penalty_arrears,
                    total_amount,
                    remarks,
                    number_of_floors,
                    basement_floor_sqft,
                    ground_floor_sqft,
                    first_floor_sqft,
                    second_floor_sqft,
                    third_floor_sqft,
                    property_name,
                    country,
                    state,
                    district,
                    taluk,
                    village_or_city,
                    pid,
                    khatha_or_property_no,
                    name_of_khathadar,
                    type_of_building
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31) 
                RETURNING sl_no`,
                [
                    payment_year,
                    receipt_no,
                    property_tax,
                    rebate, 
                    service_tax,
                    dimension_of_vacant_area,
                    dimension_of_building_area,
                    total_dimension,
                    usage_of_building,
                    department_paid,
                    cesses,
                    interest,
                    penalty_arrears,
                    total_amount,
                    remarks,
                    no_of_floors,
                    basement_floor,
                    ground_floor,
                    first_floor,
                    second_floor,
                    third_floor,
                    property_name,
                    country,
                    state,
                    district,
                    taluk,
                    village_or_city,
                    pid,
                    khatha_or_property_no,
                    name_of_khathadar,
                    type_of_building
                ]
            );
            if(req.file) {
                const fileBuffer = req.file.buffer;
                const fileType = req.file.mimetype;
                const fileName = req.file.originalname;
                //insert the image into database
                await db.query(`INSERT INTO admin_bills (sl_no,fileName,filetype,data) VALUES (${sl_no.rows[0].sl_no},$1,$2,$3)`,[fileName,fileType,fileBuffer]);
            }
            console.log("new admin payment details are added successfully");
            req.flash("success","New admin payment details added successfully");
            res.redirect("/list_all_payment_details");
            return;
        } catch (error) {
            console.log("failed to add the new institution payment details");
            console.log(error);
            req.flash("danger","Failed to add new institution payment details. An error occurred.");
            res.redirect("/new_admin_payment_details");
            return;
        }
};

export const getTransferAdminPaymentDetailsPage = async(req,res)=>{
    const sl_no = req.query.sl_no;
    if (!sl_no) {
        req.flash("danger","Invalid request");
        res.redirect("/list_all_payment_details");
        return;
    }
    try {
        // Check if the record exists and get that record
        const recordCheck = await db.query("SELECT admin_payment_details.*, admin_bills.sl_no AS bill_sl_no FROM admin_payment_details LEFT JOIN admin_bills ON admin_payment_details.sl_no = admin_bills.sl_no WHERE admin_payment_details.sl_no = $1",[sl_no]);
        if (recordCheck.rowCount === 0) {
            req.flash("danger","Payment details not found");
            res.redirect("/list_all_payment_details");
            return;
        }

        // Get a list of all institution users
        const institution_users = await db.query("SELECT institution_id,institution_name FROM institution_users");
        // Send to transfer options page
        res.render("transfer_admin_payment_details.ejs",{
            sl_no: sl_no,
            record : recordCheck.rows[0],
            institutions : institution_users.rows,
        });
        return;
    } catch (error) {
        console.error("Error transferring payment details:", error);
        req.flash("danger","An error occurred while transferring payment details");
        res.redirect("/list_all_payment_details");
        return;
    }
};

export const postTransferAdminPaymentDetails = async(req,res)=>{
    const institution_to_transfer_to = req.body.institution_to_transfer_to;
    const admin_payment_sl_no = req.body.sl_no;
    if (!institution_to_transfer_to || !admin_payment_sl_no) {
        req.flash("danger","Invalid request");
        res.redirect("/list_all_payment_details");
        return;
    }
    try {
        await db.query('BEGIN');
        
        // Get admin payment record
        const adminPayment = await db.query(
            'SELECT * FROM admin_payment_details WHERE sl_no = $1',
            [admin_payment_sl_no]
        );

        // Check if the record exists
        if (!adminPayment.rows[0]) {
            req.flash('error', 'Payment details not found');
            console.log('Payment details not found');
            res.redirect('/admin/payments');
            return;
        }

        // Check if receipt number or year already exists for this institution
        const receiptCheck = await db.query(
            'SELECT sl_no FROM institution_payment_details WHERE receipt_no_or_date = $1 UNION SELECT sl_no FROM institution_payment_details WHERE institution_id = $2 AND payment_year = $3',
            [adminPayment.rows[0].receipt_no_or_date,institution_to_transfer_to,adminPayment.rows[0].payment_year]
        );
        if (receiptCheck.rowCount > 0) {
            req.flash('danger', 'A payment record with this receipt number or year already exists for this institution');
            return res.redirect(`/transfer_admin_payment_details?sl_no=${admin_payment_sl_no}`);
        }
        
        
        // Extract values from admin payment record
        const {
            payment_year, receipt_no_or_date, property_tax, rebate, service_tax,
            dimension_of_vacant_area_sqft, dimension_of_building_area_sqft,
            total_dimension_in_sqft, usage_of_building, to_which_department_paid,
            cesses, interest, penalty_arrears, total_amount, remarks,
            number_of_floors, basement_floor_sqft, ground_floor_sqft,
            first_floor_sqft, second_floor_sqft, third_floor_sqft
        } = adminPayment.rows[0];

        // Insert into institution_payment_details
        const paymentResult = await db.query(`
            INSERT INTO institution_payment_details(
            institution_id, payment_year, receipt_no_or_date, 
            property_tax, rebate, service_tax,
            dimension_of_vacant_area_sqft, dimension_of_building_area_sqft,
            total_dimension_in_sqft, usage_of_building,
            to_which_department_paid, cesses, interest,
            penalty_arrears, total_amount, remarks,
            number_of_floors, basement_floor_sqft,
            ground_floor_sqft, first_floor_sqft,
            second_floor_sqft, third_floor_sqft
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING sl_no`,
            [
            institution_to_transfer_to, // This is how we transfer the record to an institution
            payment_year, receipt_no_or_date, property_tax, rebate, service_tax,
            dimension_of_vacant_area_sqft, dimension_of_building_area_sqft,
            total_dimension_in_sqft, usage_of_building, to_which_department_paid,
            cesses, interest, penalty_arrears, total_amount, remarks,
            number_of_floors, basement_floor_sqft, ground_floor_sqft,
            first_floor_sqft, second_floor_sqft, third_floor_sqft
            ]
        );
        
        // Transfer bills if any
        const bills = await db.query(
            'SELECT * FROM admin_bills WHERE sl_no = $1',
            [admin_payment_sl_no]
        );
        
        for (const bill of bills.rows) {
            await db.query(`
                INSERT INTO institution_bills(sl_no, filename, filetype, data)
                VALUES ($1, $2, $3, $4)`,
                [paymentResult.rows[0].sl_no, bill.filename, bill.filetype, bill.data]
            );
        }
        
        // Delete admin payment and associated bills
        await db.query(
            'DELETE FROM admin_payment_details WHERE sl_no = $1',
            [admin_payment_sl_no]
        );
        
        await db.query('COMMIT');
        req.flash('success', 'Payment details transferred successfully');
        res.redirect('/list_all_payment_details');
        return;
        
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Transfer error:', error);
        req.flash('error', 'Failed to transfer payment details');
        res.redirect('/list_all_payment_details');
        return;
    }
};

//handling the get route of generating the comprehensive report by admin
export const getComprehensiveReportAdminPage = async(req,res)=>{
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
        return;
    }
    return;
};

//handling the get route of generating the local report by admin
export const getLocalReportAdminPage = async(req,res)=>{
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
        return;
    }
    return;
};