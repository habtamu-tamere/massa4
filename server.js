const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/massagers', require('./routes/massagers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/ratings', require('./routes/ratings'));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Dimple Massager Booking API' });
});

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





// const express = require('express');
// const path = require('path');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const dotenv = require('dotenv');
// const connectDB = require('./config/database');

// // Load env vars
// dotenv.config();

// // Connect to database
// connectDB();

// // Import routes
// const authRoutes = require('./routes/auth');
// const massagerRoutes = require('./routes/massagers');
// const bookingRoutes = require('./routes/bookings');
// const paymentRoutes = require('./routes/payments');
// const ratingRoutes = require('./routes/ratings');

// const app = express();

// // Security middleware
// app.use(helmet());

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// // CORS
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true
// }));

// // Body parser
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

// // Serve static files
// app.use(express.static(path.join(__dirname, 'public')));

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/massagers', massagerRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/ratings', ratingRoutes);

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.json({ message: 'Dimple API is running!' });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ message: 'Something went wrong!' });
// });

// // Serve frontend in production
// if (process.env.NODE_ENV === 'production') {
//   app.get('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
//   });
// }

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ message: 'API endpoint not found' });
// });

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// module.exports = app;



