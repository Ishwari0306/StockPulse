/**
 * CommerceAdvisor Interface
 * Defines the contract for providing pricing and reorder recommendations
 */
class CommerceAdvisor {
  /**
   * Get pricing recommendation for a product
   * @param {Object} product - The product to analyze
   * @returns {Object} Pricing recommendation with suggested price, direction, reasoning, and confidence
   */
  async getPricingRecommendation(product) {
    throw new Error('Method getPricingRecommendation must be implemented');
  }

  /**
   * Get reorder recommendation for a product
   * @param {Object} product - The product to analyze
   * @returns {Object} Reorder recommendation with suggested quantity, reasoning, and confidence
   */
  async getReorderRecommendation(product) {
    throw new Error('Method getReorderRecommendation must be implemented');
  }

  /**
   * Get both pricing and reorder recommendations for a product
   * @param {Object} product - The product to analyze
   * @returns {Object} Combined recommendations
   */
  async getRecommendations(product) {
    const pricing = await this.getPricingRecommendation(product);
    const reorder = await this.getReorderRecommendation(product);
    
    return {
      productId: product.id,
      pricing,
      reorder
    };
  }
}

module.exports = CommerceAdvisor;