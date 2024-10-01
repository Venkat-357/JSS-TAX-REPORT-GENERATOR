export function setFlashMessages(req, res, next) {
    if (req.session.flash_messages) {
        res.locals.flash_messages = req.session.flash_messages;
    } else {
        res.locals.flash_messages = null;
    }
    next();
}