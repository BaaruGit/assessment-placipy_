# AWS Resource Setup Guide

This guide will help you set up the necessary AWS resources for the PlaciPy application.

## 1. Cognito User Pool Setup

1. Go to the AWS Console and navigate to Cognito
2. Create a new User Pool
3. Configure the user pool with the following settings:
   - Username: Email
   - Password policy: As per your security requirements
   - Multi-factor authentication: Optional or Required (as per your needs)
   - App clients: Create an app client with:
     - Uncheck "Generate client secret"
     - Enable "USER_PASSWORD_AUTH" flow

## 2. DynamoDB Table Setup

1. Go to the DynamoDB console
2. Create a new table named `Assesment_placipy`
3. Set the primary key as:
   - Partition key: `PK` (String)
   - Sort key: `SK` (String)

## 3. Environment Variables

Update your `.env` file with the actual values:

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

## 4. Sample Data Structure

Your DynamoDB table should have items with the following structure based on your schema:

### Admin User
```json
{
  "PK": "GLOBAL#ADMIN",
  "SK": "ADMIN#admin@praskla.com",
  "email": "admin@praskla.com",
  "name": "Global Super Admin",
  "role": "Administrator",
  "createdAt": "2025-11-02T10:28:00"
}
```

### College Client Metadata
```json
{
  "PK": "CLIENT#ksrce.ac.in",
  "SK": "METADATA",
  "clientType": "college",
  "collegeName": "KSR College of Engineering",
  "domain": "ksrce.ac.in",
  "location": "Salem",
  "createdAt": "2025-11-02T10:28:00"
}
```

### Student User (demo account)
```json
{
  "PK": "CLIENT#ksrce.ac.in",
  "SK": "STUDENT#student@ksrce.ac.in",
  "email": "student@ksrce.ac.in",
  "name": "Arun",
  "role": "Student",
  "department": "CSE",
  "year": 3,
  "createdAt": "2025-11-02T10:28:00"
}
```

### Student User (real account)
```json
{
  "PK": "CLIENT#ksrce.ac.in",
  "SK": "STUDENT#Arun2427@ksrce.ac.in",
  "email": "Arun2427@ksrce.ac.in",
  "name": "Arun",
  "role": "Student",
  "department": "CSE",
  "year": 3,
  "createdAt": "2025-11-02T10:28:00"
}
```

### PTO User (demo account)
```json
{
  "PK": "CLIENT#ksrce.ac.in",
  "SK": "PTO#pto@ksrce.ac.in",
  "email": "pto@ksrce.ac.in",
  "name": "Kavin",
  "role": "Placement Training Officer",
  "createdAt": "2025-11-02T10:28:00"
}
```

### PTO User (real account)
```json
{
  "PK": "CLIENT#ksrce.ac.in",
  "SK": "PTO#1001",
  "email": "PTO@ksrce.ac.in",
  "name": "Kavin",
  "role": "Placement Training Officer",
  "createdAt": "2025-11-02T10:28:00"
}
```

### PTS User (demo account)
```json
{
  "PK": "CLIENT#ksrce.ac.in",
  "SK": "PTS#pts@ksrce.ac.in",
  "email": "pts@ksrce.ac.in",
  "name": "Ravi",
  "role": "Placement Training Staff",
  "department": "MECH",
  "joiningDate": "2022-05-01",
  "createdAt": "2025-11-02T10:28:00"
}
```

### PTS User (real account)
```json
{
  "PK": "CLIENT#ksrce.ac.in",
  "SK": "PTS#2001",
  "email": "PTS@ksrce.ac.in",
  "name": "Ravi",
  "role": "Placement Training Staff",
  "department": "MECH",
  "joiningDate": "2022-05-01",
  "createdAt": "2025-11-02T10:28:00"
}
```

## 5. IAM Permissions

Ensure your AWS credentials have the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*",
        "dynamodb:GetItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:cognito-idp:region:account:userpool/your-user-pool-id",
        "arn:aws:dynamodb:region:account:table/Assesment_placipy"
      ]
    }
  ]
}
```

## 6. Testing the Setup

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```
   npm run dev
   ```

3. Access the application at `http://localhost:5173` (or the port shown in your terminal)

4. Try logging in with one of the demo accounts:
   - Student: student@ksrce.ac.in
   - PTO: pto@ksrce.ac.in
   - PTS: pts@ksrce.ac.in
   - Admin: admin@praskla.com

Note: You'll need to create these users in your Cognito User Pool with appropriate passwords.