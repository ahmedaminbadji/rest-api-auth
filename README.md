# REST API with JWT Authentication 🔐

![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)
![Express](https://img.shields.io/badge/Express-v4.18-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-v7+-brightgreen.svg)
![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

A production-ready RESTful API built with Node.js, Express, and MongoDB featuring JWT authentication, role-based access control, and comprehensive security measures.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- ✅ User registration and authentication with JWT
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (User/Admin)
- ✅ Protected routes with middleware
- ✅ Input validation
- ✅ Error handling
- ✅ Security headers with Helmet
- ✅ Rate limiting
- ✅ CORS enabled
- ✅ MongoDB database with Mongoose ODM
- ✅ RESTful API design
- ✅ Environment-based configuration

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Authentication:** JSON Web Tokens (JWT)
- **Password Hashing:** bcryptjs
- **Validation:** Validator.js
- **Security:** Helmet, CORS, Express Rate Limit


## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ahmedaminbadji/rest-api-auth.git
cd rest-api-auth
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/your_database_name
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRE=7d
```

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod
```

5. **Run the application**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5000`

## 📡 API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |
| POST | `/api/auth/logout` | Logout user | Private |

### User Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users | Private/Admin |
| GET | `/api/users/:id` | Get user by ID | Private |
| PUT | `/api/users/:id` | Update user | Private |
| DELETE | `/api/users/:id` | Delete user | Private/Admin |

## 🔑 Authentication

### Register User

**POST** `/api/auth/register`

Request Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User

**POST** `/api/auth/login`

Request Body:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Using Protected Routes

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/auth/me
```

Or in Postman:
- Go to Headers tab
- Add key: `Authorization`
- Add value: `Bearer YOUR_JWT_TOKEN`

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_EXPIRE` | Token expiration time | 7d |

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name**
- GitHub: [@ahmedaminbadji](https://github.com/ahmedaminbadji)
- LinkedIn: [Ahmed Amin Badji](https://linkedin.com/in/ahmed-amin-badji)
- Portfolio: [ahmedaminbadji.com](https://ahmedaminbadji.com)

## 🙏 Acknowledgments

- Express.js documentation
- MongoDB documentation
- JWT.io
- Postman

---

⭐️ If you found this project helpful, please consider giving it a star!

**Need help?** Open an issue or reach out on GitHub.