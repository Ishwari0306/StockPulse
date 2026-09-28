const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection without specifying database
const createDatabaseConnection = async () => {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
};

// Create database and tables
const initializeDatabase = async () => {
  let connection;
  
  try {
    // Connect without specifying database
    connection = await createDatabaseConnection();
    
    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`Database '${process.env.DB_NAME}' created or already exists`);
    
    // Close connection and reconnect with database specified
    await connection.end();
    
    // Create new connection with database specified
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // Create products table
    const createProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category ENUM('ELECTRONICS', 'APPAREL', 'HOME') NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        reorder_threshold INT NOT NULL DEFAULT 0,
        demand_velocity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        lifecycle ENUM('ACTIVE', 'PRICE_REVIEW_PENDING', 'OUT_OF_STOCK') NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createProductsTableQuery);
    console.log('Products table created or already exists');
    
    // Create pricing_suggestions table
    const createPricingSuggestionsTableQuery = `
      CREATE TABLE IF NOT EXISTS pricing_suggestions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        recommended_price DECIMAL(10, 2) NOT NULL,
        direction ENUM('INCREASE', 'DECREASE', 'HOLD') NOT NULL,
        confidence DECIMAL(3, 2) NOT NULL,
        reasoning TEXT NOT NULL,
        status ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        trigger_reason ENUM('INITIAL', 'INVENTORY_LOW', 'DEMAND_SPIKE', 'MANUAL') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_pending_suggestion (product_id, trigger_reason, status)
      )
    `;
    
    await connection.execute(createPricingSuggestionsTableQuery);
    console.log('Pricing suggestions table created or already exists');
    
    // Create reorder_suggestions table
    const createReorderSuggestionsTableQuery = `
      CREATE TABLE IF NOT EXISTS reorder_suggestions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        current_stock INT NOT NULL,
        recommended_quantity INT NOT NULL,
        suggested_lead_time_days INT NOT NULL DEFAULT 7,
        confidence DECIMAL(3, 2) NOT NULL,
        reasoning TEXT NOT NULL,
        status ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        trigger_reason ENUM('INITIAL', 'INVENTORY_LOW', 'DEMAND_SPIKE', 'MANUAL') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_pending_suggestion (product_id, trigger_reason, status)
      )
    `;
    
    await connection.execute(createReorderSuggestionsTableQuery);
    console.log('Reorder suggestions table created or already exists');
    
    // Close connection
    await connection.end();
    console.log('Database initialization completed successfully');
    
  } catch (error) {
    console.error('Database initialization error:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
};

// Run initialization
initializeDatabase();