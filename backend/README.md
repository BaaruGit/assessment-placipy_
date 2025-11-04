# PlaciPy Backend

This is the backend for the PlaciPy application, which handles authentication, authorization, and data management.

## Prerequisites

- Node.js (v14 or higher)
- AWS Account with:
  - Cognito User Pool
  - DynamoDB Table
  - Proper IAM permissions

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy the `.env.example` file to `.env` and fill in your AWS configuration:
   ```env
   # AWS Configuration
   AWS_REGION=us-east-1
   COGNITO_REGION=us-east-1
   COGNITO_USER_POOL_ID=your-actual-cognito-user-pool-id
   COGNITO_CLIENT_ID=your-actual-cognito-client-id
   COGNITO_JWKS_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yourUserPoolId/.well-known/jwks.json

   # DynamoDB Configuration
   DYNAMODB_TABLE_NAME=Assesment_placipy

   # Server Configuration
   PORT=3001
   ```

3. Set up AWS resources:
   Follow the detailed guide in [scripts/setup-aws-resources.md](scripts/setup-aws-resources.md)

4. Populate test data (optional):
   ```bash
   node scripts/populate-test-data.js
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration
- `GET /api/users/profile` - Get user profile (requires authentication)
- `PUT /api/users/profile` - Update user profile (requires authentication)
- `POST /api/users/forgot-password` - Initiate password reset
- `POST /api/users/reset-password` - Confirm password reset

## Future Plans

### Authentication Improvements
- **Cookie-based Authentication**: Implementation of secure HTTP-only cookies for token storage as an alternative to localStorage
- **First-party vs Third-party Cookie Decision**: Evaluation and decision on whether to use first-party or third-party cookies based on browser support and security considerations
- **Refresh Token Mechanism**: Implementation of refresh tokens to extend user sessions beyond the default access token expiration
- **Enhanced Session Management**: Improved session handling with better timeout controls and user activity tracking

### Security Enhancements
- **Multi-factor Authentication (MFA)**: Adding support for SMS or TOTP-based MFA for enhanced security
- **Rate Limiting Improvements**: More sophisticated rate limiting based on IP, user, and endpoint
- **Security Headers**: Additional security headers and improved CORS configuration

### Performance Optimizations
- **Caching Layer**: Implementation of Redis or similar caching mechanism for frequently accessed data
- **Database Query Optimization**: Optimized DynamoDB queries and potential migration to more efficient data structures
- **Response Compression**: Implementation of gzip compression for API responses

### Feature Extensions
- **Audit Logging**: Comprehensive logging of user actions for security and compliance
- **Notification System**: Real-time notifications for important events and updates
- **Advanced Analytics**: Enhanced reporting and analytics capabilities
- **API Versioning**: Implementation of API versioning for backward compatibility