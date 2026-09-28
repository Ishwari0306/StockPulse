const express = require('express');
const { connectDB } = require('./config/db');
const productRoutes = require('./routes/products');
const pricingSuggestionRoutes = require('./routes/pricingSuggestions');
require('dotenv').config();

const app = express();

// Connect to MySQL
connectDB();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true });
});

// Product routes
app.use('/api/products', productRoutes);

// Pricing suggestion routes
app.use('/api/pricing-suggestions', pricingSuggestionRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;