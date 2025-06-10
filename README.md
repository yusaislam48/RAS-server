# RAS Monitoring System - Backend

This is the backend API for the RAS Monitoring System, built with Express, Node.js, and MongoDB.

## Project Structure

```
/backend
├── src/                    # Source code
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── middlewares/        # Express middlewares
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   └── server.js           # Main server file
└── .env                    # Environment variables
```

## Getting Started

1. Create a `.env` file based on `.env.example`
2. Install dependencies:
   ```
   npm install
   ```
3. Start development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Super Admin only)

### Projects
- `POST /api/projects` - Create project (Super Admin only)
- `GET /api/projects` - Get all projects (Super Admin only)
- `GET /api/projects/my-projects` - Get user's projects
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project (Admin only)
- `DELETE /api/projects/:id` - Delete project (Super Admin only)
- `POST /api/projects/:id/users` - Add user to project (Admin only)
- `DELETE /api/projects/:id/users/:userId` - Remove user from project (Admin only)
- `POST /api/projects/:id/regenerate-api-key` - Regenerate API key (Admin only)

### Devices
- `POST /api/devices` - Create device (Admin only)
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get device by ID
- `PUT /api/devices/:id` - Update device (Admin only)
- `DELETE /api/devices/:id` - Delete device (Admin only)

### Sensor Data
- `POST /api/sensor-data` - Submit sensor data (API key required)
- `GET /api/sensor-data` - Get sensor data with filtering
- `GET /api/sensor-data/recent` - Get recent sensor data
- `GET /api/sensor-data/export` - Export sensor data as CSV

## Default Credentials

During development, the system is seeded with default accounts:

- Super Admin:
  - Email: admin@example.com
  - Password: admin123

- Project Admin:
  - Email: demo@example.com
  - Password: demo123 