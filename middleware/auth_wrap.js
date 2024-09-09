export function setAuthStatus(req, res, next) {
    // Tagging the request and response with the user's login status
    res.locals.isLoggedIn = req.session.isLoggedIn || false;
    if (res.locals.isLoggedIn) {
        // Transfer all details from session to res.locals so that they can be accessed by ejs
        res.locals.user_details = req.session.user_details;
        res.locals.isAdmin = req.session.isAdmin;
        res.locals.isDivisionUser = req.session.isDivisionUser;
        res.locals.isInstitutionUser = req.session.isInstitutionUser;
        res.locals.isSiteUser = req.session.isSiteUser
    }
    next();
}