# Google Sign-In Setup Guide

This project uses Google OAuth with `@react-oauth/google` on frontend and server-side token verification with `google-auth-library` on backend.

## 1) Required Packages

Already used in this codebase:

- Frontend: `@react-oauth/google`
- Backend: `google-auth-library`

If needed, install manually:

```bash
# frontend
cd frontend
npm install @react-oauth/google

# backend
cd ../backend
npm install google-auth-library
```

## 2) Create Google OAuth Client ID

1. Open Google Cloud Console: `https://console.cloud.google.com/`
2. Create/select a project.
3. Go to APIs & Services -> OAuth consent screen.
4. Configure consent screen (External/Internal) and save.
5. Go to APIs & Services -> Credentials -> Create Credentials -> OAuth client ID.
6. Application type: Web application.
7. Add authorized JavaScript origins (local):

```text
http://localhost:5173
http://localhost:5174
http://127.0.0.1:5173
http://127.0.0.1:5174
http://localhost:5175
```

8. Create credentials and copy the generated Client ID.

## 3) Configure Frontend Credentials

Set in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 4) Configure Backend Credentials

Set in `backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=replace-with-a-strong-random-secret
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Important: `GOOGLE_CLIENT_ID` on backend must be the same value as `VITE_GOOGLE_CLIENT_ID` on frontend.

## 5) Run the App

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

## 6) Implemented Auth Flow

- User clicks Continue with Google on Login/Signup page.
- Google popup returns an ID token to frontend.
- Frontend sends token to `POST /api/v1/auth/google`.
- Backend verifies token using Google OAuth library and checks verified email.
- Backend finds existing user or creates a new user with:
  - `fullName`
  - `email`
  - `profileImage`
  - `googleId`
  - `password` omitted for Google-only users
- Backend issues JWT cookie and returns authenticated user.

## 7) Troubleshooting

- `Error 400: origin_mismatch`
  - Add the exact origin shown in your browser address bar to Google Cloud Console.
  - If you opened the app from `127.0.0.1`, register `http://127.0.0.1:5173` too.
  - If Vite moved to another port because 5173 was busy, register that exact port as well.

- `Google OAuth is not configured on server`
  - Set `GOOGLE_CLIENT_ID` in `backend/.env` and restart backend.

- `Google Client ID not configured` on frontend
  - Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` and restart frontend.

- Popup closes or fails
  - Confirm localhost origin is added exactly in Google OAuth client settings.
  - Ensure browser is not blocking third-party popups.

## 8) Production Checklist

- Add production domains in OAuth authorized JavaScript origins.
- Set `NODE_ENV=production` for secure cookies.
- Use a strong `JWT_SECRET`.
- Keep all credentials in environment variables only.
