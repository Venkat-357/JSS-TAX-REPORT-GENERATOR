export function setFlashMessages(req, res, next) {
    /**
     * Middleware function to set flash messages in response locals.
     * This allows flash messages to be accessible in views during rendering.
     * 
     * Usage example:
     * req.flash('success', 'Operation successful');
     * res.redirect('/page');
     * 
     * Flash message types commonly used:
     * - success: For successful operations
     * - danger: For errors and failures
     * - info: For informational messages
     * - warning: For warning messages
     *
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object 
     * @param {Function} next - Express next middleware function
     */
    res.locals.flash_messages = req.flash();
    next();
}