export function addFlashMessages(req,other_data={}) {
    // Wrapper function to add flash messages to the data object
    // Uses `req` to add flash messages to any data object being send with the response
    // This is useful for rendering the flash messages in the EJS templates
    Object.assign(other_data, {flash_messages: req.flash()});
    return other_data;
}