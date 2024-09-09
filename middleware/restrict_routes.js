export function allowLoggedIn(req, res, next) {
    if (req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}
export function allowAdmins(req, res, next) {
    if (req.session.isLoggedIn && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login');
}
export function allowDivisionUsers(req, res, next) {
    if (req.session.isLoggedIn && req.session.isDivisionUser) {
        console.log("Division user is allowed");
        return next();
    }
    res.redirect('/login');
}
export function allowInstitutionUsers(req, res, next) {
    if (req.session.isLoggedIn && req.session.isInstitutionUser) {
        return next();
    }
    res.redirect('/login');
}

export function allowSiteUsers(req, res, next) {
    if (req.session.isLoggedIn && req.session.isSiteUser) {
        return next();
    }
    res.redirect('/login');
}

export function allowAdminsAndDivisionUsers(req, res, next) {
    if (req.session.isLoggedIn && (req.session.isAdmin || req.session.isDivisionUser)) {
        return next();
    }
    res.redirect('/login');
}
