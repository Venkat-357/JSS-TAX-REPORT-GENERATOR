/**
 * Middleware functions to restrict access to routes to specific users only.
 * 
 * @functions allowLoggedIn | allowAdminsAndInstitutionUsers | allowAdmins | allowInstitutionUsers
 * @param {Object} req - Express request object
 * @param {Object} req.session - Session object containing user authentication data
 * @param {boolean} req.session.isLoggedIn - Flag indicating if user is logged in
 * @param {boolean} req.session.isAdmin - Flag indicating if user has admin privileges
 * @param {boolean} req.session.isInstitutionUser - Flag indicating if user has institution privileges
 * @param {boolean} req.session.isDivisionUser - Flag indicating if user has division privileges
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} - Redirects to login page if unauthorized, otherwise calls next middleware
*/

export function allowLoggedIn(req, res, next) {
    /**
     * Middleware function to check if user is logged in.
     * If user is logged in, calls next middleware.
     * If user is not logged in, redirects to login page.
     * 
     * @param {Object} req - Express request object
     * @param {Object} req.session - Session object containing user authentication data
     * @param {boolean} req.session.isLoggedIn - Flag indicating if user is logged in
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {void} - Redirects to login page if unauthorized, otherwise calls next middleware
     */
    if (req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
    return;
}
export function allowAdmins(req, res, next) {
    /**
     * Middleware function to restrict route access to admin users only.
     * Checks if the user is both logged in and has admin privileges.
     * If authorized, allows request to proceed to next middleware/route handler.
     * If unauthorized, redirects to login page.
     * 
     * @param {import('express').Request} req - Express request object
     * @param {import('express').Response} res - Express response object
     * @param {import('express').NextFunction} next - Express next middleware function
     * @returns {void}
     */
    if (req.session.isLoggedIn && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login');
    return;
}

export function allowDivisionUsers(req, res, next) {
    /**
     * Middleware function to restrict access to division users only.
     * Checks if the user is logged in and is a division user.
     * If authorized, allows access to the route.
     * If unauthorized, redirects to the login page.
     * 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {void}
     */
    if (req.session.isLoggedIn && req.session.isDivisionUser) {
        return next();
    }
    res.redirect('/login');
    return;
}

export function allowInstitutionUsers(req, res, next) {
    /**
     * Middleware function to restrict access to institution users only.
     * Checks if the user is both logged in and has institution user privileges.
     * Redirects to login page if the conditions are not met.
     * 
     * @param {Object} req - Express request object
     * @param {Object} req.session - Session object containing user authentication info
     * @param {boolean} req.session.isLoggedIn - Indicates if user is logged in
     * @param {boolean} req.session.isInstitutionUser - Indicates if user has institution privileges
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {void}
     */
    if (req.session.isLoggedIn && req.session.isInstitutionUser) {
        return next();
    }
    res.redirect('/login');
    return;
}

export function allowAdminsAndDivisionUsers(req, res, next) {
    /**
     * Middleware function to restrict route access to admin users and division users.
     * Checks if user is logged in and has admin or division user privileges.
     * 
     * @param {Object} req - Express request object
     * @param {Object} req.session - Session object containing user authentication details
     * @param {boolean} req.session.isLoggedIn - Flag indicating if user is logged in
     * @param {boolean} req.session.isAdmin - Flag indicating if user is an admin
     * @param {boolean} req.session.isDivisionUser - Flag indicating if user is a division user
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {void} Calls next middleware if authorized, redirects to login if unauthorized
     */
    if (req.session.isLoggedIn && (req.session.isAdmin || req.session.isDivisionUser)) {
        return next();
    }
    res.redirect('/login');
    return;
}

export function allowAdminsAndInstitutionUsers(req, res, next) {
    /**
     * Middleware function to restrict route access to administrators and institution users.
     * Checks if the user is logged in and has either admin or institution user privileges.
     * 
     * @param {Object} req - Express request object containing session information
     * @param {Object} req.session - Session object containing user authentication details
     * @param {boolean} req.session.isLoggedIn - Indicates if user is currently logged in
     * @param {boolean} req.session.isAdmin - Indicates if user has admin privileges 
     * @param {boolean} req.session.isInstitutionUser - Indicates if user has institution access
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {void} Calls next() if authorized, redirects to login if unauthorized
     */
    if (req.session.isLoggedIn && (req.session.isAdmin || req.session.isInstitutionUser)) {
        return next();
    }
    res.redirect('/login');
    return;
}
