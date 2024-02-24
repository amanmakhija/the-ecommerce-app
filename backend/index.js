// Importing required modules
const express = require('express');
const dotenv = require('dotenv');
require('./db');
const authRoutes = require('./routes/authRoutes');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Configure dotenv
dotenv.config();

// Create an instance of express
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cookieParser({
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 7
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
}));

// Set the port
const port = process.env.PORT || 8000;

// Import routes
app.use('/api/v1/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Listen to the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});