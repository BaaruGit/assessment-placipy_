// @ts-nocheck
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

// Cache for JWKs
let jwksCache = null;
let jwksCacheTime = 0;
const JWKS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch JWKs from Cognito
 * @returns {Promise<Object>} JWKs
 */
async function fetchJwks() {
    const now = Date.now();

    // Return cached JWKs if still valid
    if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_DURATION) {
        return jwksCache;
    }

    try {
        // Validate required environment variables
        if (!process.env.COGNITO_USER_POOL_ID) {
            throw new Error('COGNITO_USER_POOL_ID is not configured. Please set it in your .env file.');
        }

        const region = process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1';
        const jwksUrl = process.env.COGNITO_JWKS_URL ||
            `https://cognito-idp.${region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

        const response = await axios.get(jwksUrl, {
            timeout: 10000, // 10 second timeout
            validateStatus: function (status) {
                return status >= 200 && status < 300; // default
            }
        });
        jwksCache = response.data;
        jwksCacheTime = now;
        return jwksCache;
    } catch (error) {
        const region = process.env.COGNITO_REGION || process.env.AWS_REGION || 'unknown';
        if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
            throw new Error(`Failed to fetch JWKs from Cognito in region: ${region}. Please verify:\n` +
                `1. COGNITO_REGION matches your User Pool region\n` +
                `2. COGNITO_USER_POOL_ID is correct\n` +
                `3. You have internet connectivity\n` +
                `4. Your Cognito User Pool exists in ${region} region\n` +
                `Original error: ${error.message}`);
        }
        throw new Error('Failed to fetch JWKs: ' + error.message);
    }
}

/**
 * Middleware to authenticate JWT tokens
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Access token required'
            });
        }

        // Fetch JWKs
        const jwks = await fetchJwks();

        // Decode token to get header
        const decodedToken = jwt.decode(token, { complete: true });
        if (!decodedToken) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token format'
            });
        }

        // Find matching JWK
        const jwk = jwks.keys.find(key => key.kid === decodedToken.header.kid);
        if (!jwk) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Unable to find matching JWK'
            });
        }

        // Convert JWK to PEM
        const pem = jwkToPem(jwk);

        // Verify token
        const verifiedToken = jwt.verify(token, pem, {
            algorithms: ['RS256'],
            issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
        });

        // Attach user to request
        req.user = verifiedToken;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token has expired'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        }

        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

/**
 * Middleware to authorize user roles
 * @param roles 
 * @returns 
 */
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }

            // Get user groups from token
            const userGroups = req.user['cognito:groups'] || [];
            
            // Also check for role in custom attributes
            const customRole = req.user['custom:role'] || req.user['role'];
            if (customRole && !userGroups.includes(customRole)) {
                userGroups.push(customRole);
            }
            
            // Log user information for debugging
            console.log('=== Authorization Debug Info ===');
            console.log('Required roles:', roles);
            console.log('User groups from token:', userGroups);
            console.log('Full user token:', JSON.stringify(req.user, null, 2));
            
            // Map frontend roles to backend roles
            const roleMapping = {
                'Student': 'student',
                'Placement Training Officer': 'pto',
                'Placement Training Staff': 'pts',
                'Administrator': 'admin',
                'Instructor': 'instructor'
            };
            
            // Also check for direct role matches (in case roles are already in the correct format)
            const normalizedUserGroups = userGroups.map(group => {
                // If it's already a known backend role, keep it
                if (['instructor', 'admin', 'student', 'pto', 'pts'].includes(group)) {
                    return group;
                }
                // Otherwise, try to map it
                return roleMapping[group] || group.toLowerCase();
            });
            
            console.log('Normalized user groups:', normalizedUserGroups);

            // Check if user has any of the required roles
            const hasRole = roles.some(role => 
                normalizedUserGroups.includes(role) || 
                normalizedUserGroups.includes(role.toLowerCase())
            );
            
            console.log('User has required role:', hasRole);

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

module.exports = {
    authenticateToken,
    authorizeRole
};