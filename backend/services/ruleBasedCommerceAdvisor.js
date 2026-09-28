const CommerceAdvisor = require('./commerceAdvisor');
const productRepository = require('../database/productRepository');

/**
 * RuleBasedCommerceAdvisor Implementation
 * Provides pricing and reorder recommendations based on predefined business rules
 */
class RuleBasedCommerceAdvisor extends CommerceAdvisor {
  /**
   * Calculate average demand velocity for a category
   * @param {string} category - The product category
   * @returns {number} Average demand velocity for the category
   */
  async calculateCategoryAverageDemandVelocity(category) {
    try {
      const query = `
        SELECT AVG(demand_velocity) as avg_demand_velocity 
        FROM products 
        WHERE category = ?
      `;
      
      const [rows] = await productRepository.pool.execute(query, [category]);
      const avg = rows[0].avg_demand_velocity;
      return avg !== null && avg !== undefined ? parseFloat(avg) : 0;
    } catch (error) {
      console.error('Error calculating category average demand velocity:', error.message);
      return 0;
    }
  }

  /**
   * Get pricing recommendation for a product based on business rules
   * @param {Object} product - The product to analyze
   * @returns {Object} Pricing recommendation with suggested price, direction, reasoning, and confidence
   */
  async getPricingRecommendation(product) {
    try {
      // Convert string values to numbers
      const currentPrice = parseFloat(product.currentPrice || product.current_price);
      const stock = parseInt(product.stock);
      const reorderThreshold = parseInt(product.reorderThreshold || product.reorder_threshold);
      const demandVelocity = parseFloat(product.demandVelocity || product.demand_velocity);
      
      // Rule 1: If stock < reorderThreshold → recommended price = currentPrice × 1.10, direction INCREASE
      if (stock < reorderThreshold) {
        const suggestedPrice = currentPrice * 1.10;
        return {
          suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
          direction: 'INCREASE',
          reasoning: `Low stock (${stock}) below reorder threshold (${reorderThreshold}). Increasing price to manage demand.`,
          confidence: 0.85
        };
      }
      
      // Rule 2: Else if demandVelocity > 2 × category average demandVelocity → recommended price = currentPrice × 1.05, direction INCREASE
      const categoryAvgDemandVelocity = await this.calculateCategoryAverageDemandVelocity(product.category);
      if (demandVelocity > 2 * categoryAvgDemandVelocity) {
        const suggestedPrice = currentPrice * 1.05;
        return {
          suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
          direction: 'INCREASE',
          reasoning: `High demand velocity (${demandVelocity}) more than double category average (${categoryAvgDemandVelocity.toFixed(2)}). Increasing price to maximize revenue.`,
          confidence: 0.80
        };
      }
      
      // Rule 3: Else → recommended price = currentPrice, direction HOLD
      return {
        suggestedPrice: parseFloat(currentPrice.toFixed(2)),
        direction: 'HOLD',
        reasoning: `Stable inventory (${stock}) and demand (${demandVelocity}) levels. No pricing adjustment needed.`,
        confidence: 0.90
      };
    } catch (error) {
      console.error('Error getting pricing recommendation:', error.message);
      // Fallback with raw product data
      const currentPrice = parseFloat(product.currentPrice || product.current_price || 0);
      return {
        suggestedPrice: parseFloat(currentPrice.toFixed(2)),
        direction: 'HOLD',
        reasoning: 'Unable to calculate recommendation due to system error.',
        confidence: 0.10
      };
    }
  }

  /**
   * Get reorder recommendation for a product based on business rules
   * @param {Object} product - The product to analyze
   * @returns {Object} Reorder recommendation with suggested quantity, reasoning, and confidence
   */
  async getReorderRecommendation(product) {
    try {
      // Convert string values to numbers
      const stock = parseInt(product.stock);
      const reorderThreshold = parseInt(product.reorderThreshold || product.reorder_threshold);
      
      // Recommended quantity = (reorderThreshold × 3) - current stock, minimum 1
      let suggestedQuantity = (reorderThreshold * 3) - stock;
      suggestedQuantity = Math.max(suggestedQuantity, 1); // Minimum 1
      
      let reasoning;
      if (suggestedQuantity <= reorderThreshold) {
        reasoning = `Current stock (${stock}) is sufficient. Small reorder recommended to maintain buffer.`;
      } else {
        reasoning = `Current stock (${stock}) is below optimal levels. Significant reorder needed to reach target inventory.`;
      }
      
      return {
        suggestedQuantity,
        reasoning,
        confidence: 0.85
      };
    } catch (error) {
      console.error('Error getting reorder recommendation:', error.message);
      return {
        suggestedQuantity: 1,
        reasoning: 'Unable to calculate recommendation due to system error. Minimum reorder quantity applied.',
        confidence: 0.10
      };
    }
  }
}

module.exports = RuleBasedCommerceAdvisor;