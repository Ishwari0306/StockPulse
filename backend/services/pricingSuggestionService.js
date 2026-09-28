const pricingSuggestionRepository = require('../database/pricingSuggestionRepository');
const { pool } = require('../config/db');

class PricingSuggestionService {
  async createSuggestion(suggestionData) {
    return await pricingSuggestionRepository.create(suggestionData);
  }

  async getSuggestionById(id) {
    const suggestion = await pricingSuggestionRepository.getById(id);
    return pricingSuggestionRepository.mapRowToSuggestion(suggestion);
  }

  async getSuggestionsByProductId(productId) {
    const suggestions = await pricingSuggestionRepository.getByProductId(productId);
    return suggestions.map(suggestion => pricingSuggestionRepository.mapRowToSuggestion(suggestion));
  }

  async hasPendingSuggestion(productId, triggerReason) {
    return await pricingSuggestionRepository.hasPendingSuggestion(productId, triggerReason);
  }

  async updateSuggestionStatus(id, status) {
    // Validate status
    if (!['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      throw new Error('Invalid status');
    }

    return await pricingSuggestionRepository.updateStatus(id, status);
  }

  async acceptSuggestion(id, productId) {
    // First get the suggestion to verify it exists and get details
    const suggestionRow = await pricingSuggestionRepository.getById(id);
    if (!suggestionRow) {
      throw new Error('Pricing suggestion not found');
    }

    // Map the row to suggestion object
    const suggestion = pricingSuggestionRepository.mapRowToSuggestion(suggestionRow);

    if (suggestion.status !== 'PENDING') {
      throw new Error('Only pending suggestions can be accepted');
    }

    // Update product's current price
    const updateProductQuery = 'UPDATE products SET current_price = ? WHERE id = ?';
    await pool.execute(updateProductQuery, [suggestion.recommendedPrice, productId]);

    // Update suggestion status to ACCEPTED
    return await pricingSuggestionRepository.updateStatus(id, 'ACCEPTED');
  }

  async rejectSuggestion(id) {
    return await pricingSuggestionRepository.updateStatus(id, 'REJECTED');
  }
}

module.exports = new PricingSuggestionService();