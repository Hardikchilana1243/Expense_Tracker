# MongoDB Integration Setup Guide

## Changes Made

Your Expense Tracker project has been successfully upgraded to use MongoDB instead of JSON files. Here are the key changes:

### 📦 Dependencies Added
- **mongoose** (^8.0.0) - MongoDB object modeling for Node.js

### 📁 Files Modified/Created

1. **Backend Configuration**
   - `backend/config/db.js` - MongoDB connection setup
   - `backend/.env.example` - Environment variables template

2. **Models (Updated to Mongoose Schemas)**
   - `backend/models/User.js` - User schema with validation
   - `backend/models/Expense.js` - Expense schema
   - `backend/models/Income.js` - Income schema

3. **Controllers (Updated to MongoDB Operations)**
   - `backend/controllers/authController.js` - User registration & login with MongoDB

4. **Routes (Updated to Async MongoDB Queries)**
   - `backend/routes/authRoutes.js`
   - `backend/routes/expenseRoutes.js`
   - `backend/routes/incomeRoutes.js`
   - `backend/routes/dashboardRoutes.js`

5. **Server**
   - `backend/server.js` - Added MongoDB connection

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Set Up Environment Variables
1. Copy `.env.example` to `.env` in the backend folder:
   ```bash
   cp .env.example .env
   ```

2. Configure your MongoDB connection in `.env`:
   - **Local MongoDB**: Keep default `MONGODB_URI=mongodb://localhost:27017/expense-tracker`
   - **MongoDB Atlas** (Cloud): Replace with your connection string

### Step 3: Install MongoDB (if using Local)

#### Windows:
1. Download from: https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose "Install MongoDB as a Service"
4. MongoDB will start automatically

#### macOS (with Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu):
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### Step 4: Verify MongoDB Connection
```bash
# In a new terminal, check if MongoDB is running
mongosh  # or mongo (for older versions)
```

### Step 5: Start the Backend Server
```bash
cd backend
npm run dev
```

You should see:
```
✓ MongoDB connected successfully
Server is running on port 3000
```

## 🔄 API Changes

### User IDs
- **Before**: Numeric IDs (e.g., `1234567890`)
- **After**: MongoDB ObjectIds (e.g., `507f1f77bcf86cd799439011`)

Make sure your frontend is updated to handle these new user IDs.

### Expense Routes

**Before**:
- `DELETE /api/v1/expenses/:expenseId/:userId`

**After**:
- `POST /api/v1/expenses/:userId` - Create expense
- `GET /api/v1/expenses/:userId` - Get all expenses
- `PUT /api/v1/expenses/:expenseId` - Update expense
- `DELETE /api/v1/expenses/:expenseId` - Delete expense

### Income Routes

**Before**:
- `DELETE /api/v1/income/:incomeId/:userId`

**After**:
- `POST /api/v1/income/:userId` - Create income
- `GET /api/v1/income/:userId` - Get all income
- `PUT /api/v1/income/:incomeId` - Update income
- `DELETE /api/v1/income/:incomeId` - Delete income

## 📊 Data Schema Examples

### User
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "hashed_password",
  "profilePhoto": "url_or_null",
  "createdAt": "2024-04-21T10:00:00Z",
  "updatedAt": "2024-04-21T10:00:00Z"
}
```

### Expense
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "category": "Food",
  "amount": 25.50,
  "description": "Lunch",
  "date": "2024-04-21T10:00:00Z",
  "paymentMethod": "credit_card",
  "createdAt": "2024-04-21T10:00:00Z",
  "updatedAt": "2024-04-21T10:00:00Z"
}
```

### Income
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439011",
  "source": "Salary",
  "amount": 3000,
  "description": "Monthly salary",
  "date": "2024-04-21T10:00:00Z",
  "createdAt": "2024-04-21T10:00:00Z",
  "updatedAt": "2024-04-21T10:00:00Z"
}
```

## 🔐 Security Improvements

1. **Input Validation** - All routes now have proper input validation
2. **Error Handling** - Better error messages and HTTP status codes
3. **Data Validation** - Mongoose schemas enforce data types and constraints

## ⚠️ Next Steps for Production

1. **Password Hashing**: Install and use `bcryptjs` for password hashing
2. **JWT Authentication**: Implement JWT tokens for secure API authentication
3. **Environment Validation**: Add validation for required environment variables
4. **Rate Limiting**: Add rate limiting to prevent abuse
5. **Input Sanitization**: Add input sanitization middleware

## 📝 Example Frontend Updates

Update your API calls to use MongoDB ObjectIds:

**Frontend (Frontend needs update):**
```javascript
// After login, the user object now has _id instead of id
const userId = user._id; // MongoDB ObjectId
```

## 🆘 Troubleshooting

### "MongoDB connection failed"
- Ensure MongoDB is running
- Check your `MONGODB_URI` in `.env`
- Verify network access (for MongoDB Atlas)

### "Invalid user ID" error
- User IDs must be valid MongoDB ObjectIds
- Check the format: `507f1f77bcf86cd799439011`

### "Cannot read property 'getTotalExpense'"
- This error indicates old model methods are being called
- Ensure all dependencies are reinstalled: `npm install`

## 📚 Useful Resources

- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [MongoDB Atlas (Cloud Database)](https://www.mongodb.com/cloud/atlas)
