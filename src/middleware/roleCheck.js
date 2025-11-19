// middleware/roleCheck.js

export const checkRole = (roles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;  // The role should be set by Clerk
        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({ message: 'Permission denied. Unauthorized role.' });
        }
        next();  // Proceed to the next handler if the role is valid
    };
};
