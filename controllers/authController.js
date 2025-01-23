import db from '../db.js';

export const getLogin = (req,res)=>{
    if (req.session.isLoggedIn) {
        res.redirect("/home");
        return;
    } else {
        res.render("login.ejs");
        return;
    }
};

// TODO: Use bcrypt for password hashing
export const postLogin = async(req,res) => {
    console.log("Login request received");
    const email = req.body.email;
    const password = req.body.password;
    // For admins
    let query_result = await db.query(`SELECT * FROM admins WHERE email = '${email}'`);
    if (query_result.rows.length > 0) {
        const user = query_result.rows[0];
        const admin_id = user.admin_id;
        if (user.password === password) {
            req.session.isLoggedIn = true;
            req.session.isAdmin = true;
            req.session.isDivisionUser = false;
            req.session.isInstitutionUser = false;
            req.session.user_details = {
                admin_id : admin_id,
                email : user.email
            };
            req.flash("success", "Logged in successfully");
            res.redirect("/admin");
            return;
        } else {
            req.flash("danger", "Invalid credentials");
            res.redirect("/login");
            return;
        }
    }
    // For division users
    query_result = await db.query(`SELECT * FROM division_users WHERE email = '${email}'`);
    if (query_result.rows.length > 0) {
        const user = query_result.rows[0];
        if (user.password === password) {
            req.session.isLoggedIn = true;
            req.session.isAdmin = false;
            req.session.isDivisionUser = true;
            req.session.isInstitutionUser = false;
            req.session.user_details = {
                division_id : user.division_id,
                division : user.division,
                email : user.email,
            };
            req.flash("success", "Logged in successfully");
            res.redirect("/division");
            return;
        } else {
            req.flash("danger", "Invalid credentials");
            res.redirect("/login");
            return;
        }
    }
    // For institution users
    query_result = await db.query(`SELECT * FROM institution_users WHERE email = '${email}'`);
    if (query_result.rows.length > 0) {
        const user = query_result.rows[0];
        if (user.password === password) {
            req.session.isLoggedIn = true;
            req.session.isAdmin = false;
            req.session.isDivisionUser = false;
            req.session.isInstitutionUser = true;
            req.session.user_details = {
                institution_id : user.institution_id,
                institution : user.institution_name,
                email : user.email,
            };
            req.flash("success", "Logged in successfully");
            res.redirect("/institution");
            return;
        } else {
            req.flash("danger", "Invalid credentials");
            res.redirect("/login");
            return;
        }
    }
    req.flash("danger", "Invalid credentials");
    res.redirect("/login");
    return;
}

export const getLogout = async(req,res) => {
    if (!req.session.isLoggedIn) {
        res.redirect("/login");
        return;
    }
    req.session.isLoggedIn = false;
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect("/login")
        return;
    });
}