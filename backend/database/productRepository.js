const { pool } = require('../config/db');

class ProductRepository {
  // Create a new product
  async create(productData) {
    const { sku, name, category, currentPrice, stock, reorderThreshold, demandVelocity, lifecycle } = productData;
    
    const query = `
      INSERT INTO products 
      (sku, name, category, current_price, stock, reorder_threshold, demand_velocity, lifecycle)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [sku, name, category, currentPrice, stock, reorderThreshold, demandVelocity, lifecycle || 'ACTIVE'];
    
    try {
      const [result] = await pool.execute(query, values);
      return await this.getById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Get all products
  async findAll() {
    const query = 'SELECT * FROM products ORDER BY created_at DESC';
    
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get product by ID
  async getById(id) {
    const query = 'SELECT * FROM products WHERE id = ?';
    
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get product by SKU
  async getBySku(sku) {
    const query = 'SELECT * FROM products WHERE sku = ?';
    
    try {
      const [rows] = await pool.execute(query, [sku]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Check if product exists by SKU
  async existsBySku(sku) {
    const query = 'SELECT COUNT(*) as count FROM products WHERE sku = ?';
    
    try {
      const [rows] = await pool.execute(query, [sku]);
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update product by ID
  async updateById(id, updateData) {
    // Build dynamic update query
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id') { // Skip ID field
        // Map JS field names to DB column names
        const columnName = this.mapFieldNameToColumn(key);
        fields.push(`${columnName} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    
    try {
      await pool.execute(query, values);
      return await this.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Delete product by ID
  async deleteById(id) {
    const query = 'DELETE FROM products WHERE id = ?';
    
    try {
      const [result] = await pool.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Expose the pool for direct queries by other services
  get pool() {
    return pool;
  }

  // Helper method to map JS field names to DB column names
  mapFieldNameToColumn(fieldName) {
    const fieldMap = {
      'currentPrice': 'current_price',
      'reorderThreshold': 'reorder_threshold',
      'demandVelocity': 'demand_velocity'
    };
    
    return fieldMap[fieldName] || fieldName;
  }

  // Helper method to map DB column names to JS field names
  mapColumnToFieldName(columnName) {
    const columnMap = {
      'current_price': 'currentPrice',
      'reorder_threshold': 'reorderThreshold',
      'demand_velocity': 'demandVelocity',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt'
    };
    
    return columnMap[columnName] || columnName;
  }

  // Map database row to product object with proper field names
  mapRowToProduct(row) {
    if (!row) return null;
    
    const product = {};
    for (const [key, value] of Object.entries(row)) {
      const fieldName = this.mapColumnToFieldName(key);
      product[fieldName] = value;
    }
    
    return product;
  }
}

module.exports = new ProductRepository();