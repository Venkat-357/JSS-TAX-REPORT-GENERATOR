// TODO: Use bcrypt for password hashing
export const login = async(req,res,db) => {
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
            req.session.isSiteUser = false;
            req.session.user_details = {
                admin_id : admin_id,
                email : user.email
            };
            res.redirect("/admin");
            return;
        } else {
            res.send("Invalid credentials");
            return;
        }
    }
    console.log("Admin check done");
    // For division users
    query_result = await db.query(`SELECT * FROM division_users WHERE email = '${email}'`);
    if (query_result.rows.length > 0) {
        const user = query_result.rows[0];
        console.log(user)
        if (user.password === password) {
            req.session.isLoggedIn = true;
            req.session.isAdmin = false;
            req.session.isDivisionUser = true;
            req.session.isInstitutionUser = false;
            req.session.isSiteUser = false;
            req.session.user_details = {
                division_id : user.division_id,
                division : user.division,
                email : user.email,
            };
            res.redirect("/division");
            return;
        } else {
            res.send("Invalid credentials");
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
            req.session.isSiteUser = false;
            req.session.user_details = {
                institution_id : user.institution_id,
                institution : user.institution,
                email : user.email,
            };
            res.redirect("/institution");
            return;
        } else {
            res.send("Invalid credentials");
            return;
        }
    }
    // For site users
    query_result = await db.query(`SELECT * FROM site_users WHERE email = '${email}'`);
    if (query_result.rows.length > 0) {
        const user = query_result.rows[0];
        if (user.password === password) {
            req.session.isLoggedIn = true;
            req.session.isAdmin = false;
            req.session.isDivisionUser = false;
            req.session.isInstitutionUser = false;
            req.session.isSiteUser = true;
            req.session.user_details = {
                site_id : user.site_id,
                site : user.site,
                email : user.email,
            };
            res.redirect("/site");
            return;
        } else {
            res.send("Invalid credentials");
            return;
        }
    }
    res.send("Invalid credentials");
    return;
}

export const logout = async(req,res) => {
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