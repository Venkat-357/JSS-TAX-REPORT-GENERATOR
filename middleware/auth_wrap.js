export function setAuthStatus(req, res, next) {
    /**
     * Middleware function that sets authentication status and user details in response locals.
     * This function transfers authentication state and user details from session to res.locals,
     * making them accessible in EJS templates.
     *
     * @param {Object} req - Express request object containing session information
     * @param {Object} req.session - Session object containing user authentication details
     * @param {boolean} req.session.isLoggedIn - Flag indicating if user is logged in
     * @param {Object} req.session.user_details - User's profile information
     * @param {boolean} req.session.isAdmin - Flag indicating if user has admin privileges
     * @param {boolean} req.session.isDivisionUser - Flag indicating if user has division level access
     * @param {boolean} req.session.isInstitutionUser - Flag indicating if user has institution level access
     * 
     * @param {Object} res - Express response object
     * @param {Object} res.locals - Object for passing data to views
     * 
     * @param {Function} next - Express next middleware function
     * 
     * @returns {void}
     */

    // Tagging the request and response with the user's login status
    res.locals.isLoggedIn = req.session.isLoggedIn || false;
    if (res.locals.isLoggedIn) {
        // Transfer all details from session to res.locals so that they can be accessed by ejs
        res.locals.user_details = req.session.user_details;
        res.locals.isAdmin = req.session.isAdmin;
        res.locals.isDivisionUser = req.session.isDivisionUser;
        res.locals.isInstitutionUser = req.session.isInstitutionUser;
    }
    next();
}