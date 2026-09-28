const productRepository = require('../database/productRepository');

class ProductService {
  // Create a new product
  async createProduct(productData) {
    try {
      // Validate that stock = 0 means OUT_OF_STOCK lifecycle
      if (productData.stock === 0 && !productData.lifecycle) {
        productData.lifecycle = 'OUT_OF_STOCK';
      }
      
      return await productRepository.create(productData);
    } catch (error) {
      throw error;
    }
  }

  // Get all products
  async getAllProducts() {
    try {
      return await productRepository.findAll();
    } catch (error) {
      throw error;
    }
  }

  // Get product by ID
  async getProductById(id) {
    try {
      return await productRepository.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Get product by SKU
  async getProductBySku(sku) {
    try {
      return await productRepository.getBySku(sku);
    } catch (error) {
      throw error;
    }
  }

  // Update product by ID
  async updateProduct(id, updateData) {
    try {
      // If stock is being updated to 0, set lifecycle to OUT_OF_STOCK
      if (updateData.stock === 0) {
        updateData.lifecycle = 'OUT_OF_STOCK';
      }
      
      return await productRepository.updateById(id, updateData);
    } catch (error) {
      throw error;
    }
  }

  // Delete product by ID
  async deleteProduct(id) {
    try {
      const deleted = await productRepository.deleteById(id);
      if (!deleted) {
        throw new Error('Product not found');
      }
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ProductService();