import db from "../db.js";

//handling the /institution route and displaying the home page of institution users
export const getInstitutionPage = (req,res)=>{
    res.render("institution.ejs");
    return;
};

//handling the /list_payment_details_in_institution route to display all the institution payment details  
export const getListPaymentDetailsInInstitutionPage = async(req,res)=>{
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
};

//handling the /new_institution_payment_details route and displaying the page to add new institution users
export const getNewInstitutionPaymentDetailsPage = (req,res)=>{
    res.render("new_institution_payment_details.ejs",{
        institution_id:req.session.user_details.institution_id,
    });
    return;
};

//handling the /new_institution_payment_details route to upload the new institution payment details to the database
export const postNewInstitutionPaymentDetails = async(req,res)=>{
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
    const penalty_arrears = req.body[`penalty-arrears`];
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    const no_of_floors = req.body[`number_of_floors`];
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
            let sl_no = await db.query("INSERT INTO institution_payment_details (institution_id,payment_year,receipt_no_or_date,property_tax,rebate,service_tax,dimension_of_vacant_area_sqft,dimension_of_building_area_sqft,total_dimension_in_sqft,usage_of_building,to_which_department_paid,cesses,interest,penalty_arrears,total_amount,remarks,number_of_floors,basement_floor_sqft,ground_floor_sqft,first_floor_sqft,second_floor_sqft,third_floor_sqft) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING sl_no",[institution_id,payment_year,receipt_no,property_tax,rebate,service_tax,dimension_of_vacant_area,dimension_of_building_area,total_dimension,usage_of_building,department_paid,cesses,interest,penalty_arrears,total_amount,remarks,no_of_floors,basement_floor,ground_floor,first_floor,second_floor,third_floor]);
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
};

//handling the route to modify the institution payment details by the respective institution user
export const getModifyInstitutionPaymentDetailsPage = async(req,res)=>{
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
    // Make sure the institution user is the owner of the payment details
    const institutionCheck = await db.query("SELECT * FROM institution_payment_details WHERE sl_no = $1 AND institution_id = $2", [sl_no, req.session.user_details.institution_id]);
    if (institutionCheck.rowCount === 0) {
        console.log("Not authorized");
        req.flash("danger","Not authorized");
        res.redirect("/list_payment_details_in_institution");
        return;
    }
    res.render("modify_institution_payment_details.ejs",{
        retrieved_info : retrieved_info,
    });
    return;
};

export const postModifyInstitutionPaymentDetails = async(req,res)=>{
    const sl_no = req.body[`sl_no`];
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
    const penalty_arrears = req.body[`penalty-arrears`];
    const total_amount = req.body[`total-amount`];
    const remarks = req.body.remarks;
    const no_of_floors = req.body[`number_of_floors`];
    const basement_floor = req.body[`basement-floor-in-sqft`];
    const ground_floor = req.body[`ground-floor-in-sqft`];
    const first_floor = req.body[`first-floor-in-sqft`];
    const second_floor = req.body[`second-floor-in-sqft`];
    const third_floor = req.body[`third-floor-in-sqft`];
    try {
        const updateResult = await db.query(
            `UPDATE institution_payment_details 
            SET 
            payment_year = $1,
            receipt_no_or_date = $2,
            property_tax = $3,
            rebate = $4,
            service_tax = $5,
            dimension_of_vacant_area_sqft = $6,
            dimension_of_building_area_sqft = $7,
            total_dimension_in_sqft = $8,
            usage_of_building = $9,
            to_which_department_paid = $10,
            cesses = $11,
            interest = $12,
            penalty_arrears = $13,
            total_amount = $14,
            remarks = $15,
            number_of_floors = $16,
            basement_floor_sqft = $17,
            ground_floor_sqft = $18,
            first_floor_sqft = $19,
            second_floor_sqft = $20,
            third_floor_sqft = $21
            WHERE sl_no = $22 RETURNING *`,
            [
            payment_year, receipt_no, property_tax, rebate, service_tax,
            dimension_of_vacant_area, dimension_of_building_area, total_dimension,
            usage_of_building, department_paid, cesses, interest, penalty_arrears,
            total_amount, remarks, no_of_floors, basement_floor, ground_floor,
            first_floor, second_floor, third_floor, sl_no
            ]
        );
        if (updateResult.rowCount === 0) {
            console.log("No records updated. Check if sl_no is correct.");
        } else {
            console.log("Update successful");
        }
        if(req.file) {
            const fileBuffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const fileName = req.file.originalname;
            //insert the image into database
            await db.query("UPDATE institution_bills SET data=$2,fileType=$3,fileName=$4 WHERE sl_no=$1",[sl_no,fileBuffer,fileType,fileName]);
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
};

//handling the route to delete the payment details of institution users
export const getDeleteInstitutionPaymentDetailsPage = async(req,res)=>{
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
};

//handling the get route to generate the comprehensive report for institution user
export const getComprehensiveReportInInstitutionPage = async(req,res)=>{
    let institution_id = req.session.user_details.institution_id;
    const institution_report_query_result = await db.query("SELECT institution_users.institution_id,institution_users.institution_name,institution_users.khatha_or_property_no,institution_users.pid,institution_payment_details.* FROM institution_users LEFT JOIN institution_payment_details ON institution_users.institution_id = institution_payment_details.institution_id WHERE institution_users.institution_id=$1",[institution_id]);
    const comprehensive_institution_report = institution_report_query_result.rows;
    res.render("comprehensive_report_institution.ejs",{
        comprehensive_institution_report : comprehensive_institution_report,
    });
    return;
};

//handling the get route to generate the local report for the institution user
export const getLocalReportInInstitutionPage = async(req,res)=>{
    let institution_id = req.session.user_details.institution_id;
    const local_instituion_report_query_result = await db.query(" SELECT institution_id,institution_name,khatha_or_property_no,name_of_khathadar,pid FROM institution_users WHERE institution_id=$1",[institution_id]);
    const local_institution_report = local_instituion_report_query_result.rows;
    res.render("local_report_institution.ejs",{
        local_institution_report : local_institution_report,
    });
    return;
};
