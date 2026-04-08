# JWT Authentication Setup Instructions

## Step 1: Add JWT_SECRET to .env file

Open your backend/.env file and add this line:

```
JWT_SECRET=your_super_secret_random_string_here
```

Replace `your_super_secret_random_string_here` with a long, random string for security.

## Step 2: Authentication Endpoints

Your backend now has these authentication endpoints:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login existing user

## Step 3: Frontend Access

Navigate to `http://localhost:5173/auth` to access the login/register page.

## Step 4: Testing

You can test the authentication by:

1. Registering a new account
2. Logging in with the same credentials
3. Checking localStorage for token and userInfo

## Features Implemented

✅ Backend JWT authentication with bcrypt password hashing
✅ Black & Emerald themed AuthPage component
✅ Login/Register toggle functionality
✅ Form validation and error handling
✅ LocalStorage token management
✅ Protected route structure ready for future use

The authentication system is now fully implemented and ready to use!
