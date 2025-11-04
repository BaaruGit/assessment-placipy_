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
        const jwksUrl = process.env.COGNITO_JWKS_URL ||
            `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

        const response = await axios.get(jwksUrl);
        jwksCache = response.data;
        jwksCacheTime = now;
        return jwksCache;
    } catch (error) {
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

            // Check if user has any of the required roles
            const hasRole = roles.some(role => userGroups.includes(role));

            if (!hasRole) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Insufficient permissions'
                });
            }

            next();
        } catch (error) {
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