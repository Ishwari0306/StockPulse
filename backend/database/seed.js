const productRepository = require('../database/productRepository');
const { connectDB } = require('../config/db');
require('dotenv').config();

// Product seed data
const products = [
  {
    sku: 'PRD-001',
    name: 'Wireless Earbuds Pro',
    category: 'ELECTRONICS',
    currentPrice: 79.99,
    stock: 45,
    reorderThreshold: 20,
    demandVelocity: 3,
    lifecycle: 'ACTIVE'
  },
  {
    sku: 'PRD-002',
    name: 'USB-C Hub 7-Port',
    category: 'ELECTRONICS',
    currentPrice: 34.99,
    stock: 120,
    reorderThreshold: 30,
    demandVelocity: 1,
    lifecycle: 'ACTIVE'
  },
  {
    sku: 'PRD-003',
    name: 'Organic Cotton T-Shirt',
    category: 'APPAREL',
    currentPrice: 24.99,
    stock: 8,
    reorderThreshold: 15,
    demandVelocity: 12,
    lifecycle: 'PRICE_REVIEW_PENDING'
  },
  {
    sku: 'PRD-004',
    name: 'Running Shorts — Navy',
    category: 'APPAREL',
    currentPrice: 39.99,
    stock: 55,
    reorderThreshold: 20,
    demandVelocity: 2,
    lifecycle: 'ACTIVE'
  },
  {
    sku: 'PRD-005',
    name: 'Ceramic Pour-Over Set',
    category: 'HOME',
    currentPrice: 49.99,
    stock: 22,
    reorderThreshold: 10,
    demandVelocity: 4,
    lifecycle: 'ACTIVE'
  },
  {
    sku: 'PRD-006',
    name: 'LED Desk Lamp — Dimmable',
    category: 'HOME',
    currentPrice: 59.99,
    stock: 0,
    reorderThreshold: 15,
    demandVelocity: 0,
    lifecycle: 'OUT_OF_STOCK'
  },
  {
    sku: 'PRD-007',
    name: 'Portable Charger 20K',
    category: 'ELECTRONICS',
    currentPrice: 44.99,
    stock: 18,
    reorderThreshold: 25,
    demandVelocity: 8,
    lifecycle: 'ACTIVE'
  },
  {
    sku: 'PRD-008',
    name: 'Hoodie — Heather Grey',
    category: 'APPAREL',
    currentPrice: 54.99,
    stock: 11,
    reorderThreshold: 12,
    demandVelocity: 15,
    lifecycle: 'ACTIVE'
  }
];

const seedProducts = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('Seeding products...');
    
    let createdCount = 0;
    let skippedCount = 0;
    
    // Insert each product if it doesn't already exist
    for (const product of products) {
      const exists = await productRepository.existsBySku(product.sku);
      
      if (!exists) {
        await productRepository.create(product);
        console.log(`Created product: ${product.sku} - ${product.name}`);
        createdCount++;
      } else {
        console.log(`Skipped product (already exists): ${product.sku} - ${product.name}`);
        skippedCount++;
      }
    }
    
    console.log(`\nSeed completed!`);
    console.log(`- Created: ${createdCount} products`);
    console.log(`- Skipped: ${skippedCount} products (already existed)`);
    console.log(`- Total: ${products.length} products processed`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error.message);
    process.exit(1);
  }
};

// Run the seed function
seedProducts();