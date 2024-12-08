export function setFlashMessages(req, res, next) {
    res.locals.flash_messages = req.flash();
    next();
}