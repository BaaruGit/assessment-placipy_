// @ts-nocheck
import { jwtVerify, createRemoteJWKSet } from 'jose';

// Configure JWKS source
let JWKS = null;

function getJWKS() {
    if (!JWKS) {
        if (!process.env.COGNITO_USER_POOL_ID) {
            throw new Error('COGNITO_USER_POOL_ID is not configured');
        }
        const region = process.env.COGNITO_REGION || process.env.AWS_REGION || 'ap-south-1';
        const url = new URL(
            `https://cognito-idp.${region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
        );
        JWKS = createRemoteJWKSet(url);
    }
    return JWKS;
}

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Access token required'
            });
        }

        const jwks = getJWKS();

        try {
            const { payload } = await jwtVerify(token, jwks, {
                issuer: `https://cognito-idp.${process.env.COGNITO_REGION || process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
            });

            req.user = payload;
            next();
        } catch (err) {
            console.error('Token verification failed:', err.message);
            if (err.code === 'ERR_JWT_EXPIRED') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Token has expired'
                });
            }
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

/**
 * Middleware to authorize user roles
 */
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }

            const userGroups = req.user['cognito:groups'] || [];
            const customRole = req.user['custom:role'] || req.user['role'];

            if (customRole && !userGroups.includes(customRole)) {
                userGroups.push(customRole);
            }

            const roleMapping = {
                'Student': 'student',
                'Placement Training Officer': 'pto',
                'Placement Training Staff': 'pts',
                'Administrator': 'admin',
                'Instructor': 'instructor'
            };

            const normalizedUserGroups = userGroups.map(group => {
                if (['instructor', 'admin', 'student', 'pto', 'pts'].includes(group)) {
                    return group;
                }
                return roleMapping[group] || group.toLowerCase();
            });

            const hasRole = roles.some(role =>
                normalizedUserGroups.includes(role) ||
                normalizedUserGroups.includes(role.toLowerCase())
            );

            if (!hasRole) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Insufficient permissions'
                });
            }

            next();
        } catch (error) {
            console.error('Authorization error:', error);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Authorization failed'
            });
        }
    };
};

export { authenticateToken };