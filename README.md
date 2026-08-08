# Boilerplate Web Node.js TypeScript

A robust and scalable Node.js backend boilerplate built with TypeScript, Express, and MongoDB. This project provides a solid foundation for building web applications with authentication, file uploads, real-time features, and more.

## 🚀 Features

- **TypeScript** - Full TypeScript support for type safety
- **Express.js** - Fast and minimalist web framework
- **MongoDB with Mongoose** - Database integration with ODM
- **JWT Authentication** - Secure token-based authentication
- **Socket.IO** - Real-time bidirectional communication
- **File Upload** - Cloudinary integration for file storage
- **Email Service** - Nodemailer for email notifications
- **Validation** - Zod for request validation
- **Error Handling** - Comprehensive error handling system
- **Environment Configuration** - Secure environment variable management
- **CORS** - Cross-origin resource sharing enabled
- **Cookie Parser** - HTTP cookie management
- **BCrypt** - Password hashing and security
- **ESLint & Prettier** - Code linting and formatting

## 📦 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd boilerplate-web-nodejs-typescript
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Configure all required environment variables:

   ```env
   # Server
   NODE_ENV=development
   PORT=5000

   # Database
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority

   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=1h
   ACCESS_TOKEN_SECRET=your_access_token_secret
   ACCESS_TOKEN_EXPIRES=7d
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   REFRESH_TOKEN_EXPIRES=90d

   # Bcrypt
   BCRYPT_SALT_ROUNDS=10

   # Cloudinary (for file uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Email (Nodemailer)
   EMAIL_EXPIRES=900000
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_ADDRESS=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=your_email@gmail.com
   EMAIL_TO=""
   ADMIN_EMAIL=admin@example.com

   # Frontend
   FRONTEND_URL=http://localhost:3000
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
Runs the server with hot-reload using `ts-node-dev`.

### Production Build
```bash
npm run build
npm start:prod
```
Compiles TypeScript to JavaScript and runs the production server.

### Other Scripts
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix linting issues
npm run prettier      # Format code with Prettier
npm run prettier:fix  # Fix formatting issues
```

## 📁 Project Structure

```
src/
├── app/
│   ├── config/          # Environment configuration
│   ├── error/           # Error handling utilities
│   ├── middlewares/     # Custom middleware
│   └── routes/          # Route definitions
├── modules/
│   ├── auth/            # Authentication module
│   └── user/            # User management module
├── helper/              # Utility functions
├── utils/               # Additional utilities
├── server.ts           # Server entry point
└── app.ts              # Express app configuration
```

## 🔌 API Endpoints

### Authentication Routes (`/api/v1/auth`)
- `POST /register` - User registration with email verification
- `POST /verify-email` - Verify email with OTP
- `POST /login` - User login
- `POST /refresh-token` - Refresh access token
- `POST /forgot-password` - Request password reset OTP
- `POST /reset-password` - Reset password with OTP
- `POST /logout` - User logout

### User Routes (`/api/v1/user`)
- `POST /create-user` - Create new user (admin only)
- `GET /get-all-user` - Get all users
- `GET /get-user/:id` - Get user by ID
- `PUT /update-user/:id` - Update user information
- `DELETE /delete-user/:id` - Delete user (admin only)

## 🛡️ Authentication Flow

1. **Registration**: User registers → receives OTP via email → verifies email
2. **Login**: User logs in → receives access and refresh tokens
3. **Protected Routes**: JWT token required in Authorization header
4. **Token Refresh**: Use refresh token to get new access token
5. **Password Reset**: Request OTP → verify OTP → set new password

## 📧 Email Templates

The project includes email templates for:
- OTP verification (registration and password reset)
- User creation confirmation
- Welcome emails

## 🔄 Real-time Features

Socket.IO is integrated for real-time functionality:
- Chat messaging
- Real-time notifications
- Live updates

## 🗃️ Database Models

### User Model
```typescript
{
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  profileImage?: string;
  otp?: string;
  otpExpiry?: Date;
  verified?: boolean;
}
```

## 🚨 Error Handling

The application includes comprehensive error handling for:
- Validation errors (Zod)
- Database errors (Mongoose)
- Authentication errors
- Custom application errors

## 🔧 Configuration

### Environment Variables
All sensitive configuration is managed through environment variables. See the `.env.example` file for all required variables.

### Cloudinary Setup
For file uploads, configure your Cloudinary credentials in the environment variables.

### Email Service
Configure your email service provider (Gmail recommended for development) in the environment variables.

## 🧪 Testing

To add tests to the project:

1. Install testing dependencies:
   ```bash
   npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
   ```

2. Create a `jest.config.js` file
3. Add test scripts to package.json

## 📦 Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start:prod
```

### Docker (Optional)
Consider adding Docker configuration for containerized deployment.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB is running and accessible
4. Check that all required ports are available

## 🔗 Useful Links

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Socket.IO Documentation](https://socket.io/)
- [Cloudinary Documentation](https://cloudinary.com/)

---

**Happy Coding!** 🎉