const reorderSuggestionRepository = require('../database/reorderSuggestionRepository');
const { pool } = require('../config/db');

class ReorderSuggestionService {
  async createSuggestion(suggestionData) {
    // Validate recommended quantity is positive
    if (suggestionData.recommendedQuantity <= 0) {
      throw new Error('Recommended quantity must be positive');
    }
    
    return await reorderSuggestionRepository.create(suggestionData);
  }

  async getSuggestionById(id) {
    const suggestion = await reorderSuggestionRepository.getById(id);
    return reorderSuggestionRepository.mapRowToSuggestion(suggestion);
  }

  async getSuggestionsByProductId(productId) {
    const suggestions = await reorderSuggestionRepository.getByProductId(productId);
    return suggestions.map(suggestion => reorderSuggestionRepository.mapRowToSuggestion(suggestion));
  }

  async hasPendingSuggestion(productId, triggerReason) {
    return await reorderSuggestionRepository.hasPendingSuggestion(productId, triggerReason);
  }

  async updateSuggestionStatus(id, status) {
    // Validate status
    if (!['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      throw new Error('Invalid status');
    }

    return await reorderSuggestionRepository.updateStatus(id, status);
  }

  async acceptSuggestion(id, productId) {
    // First get the suggestion to verify it exists and get details
    const suggestionRow = await reorderSuggestionRepository.getById(id);
    if (!suggestionRow) {
      throw new Error('Reorder suggestion not found');
    }

    // Map the row to suggestion object
    const suggestion = reorderSuggestionRepository.mapRowToSuggestion(suggestionRow);

    if (suggestion.status !== 'PENDING') {
      throw new Error('Only pending suggestions can be accepted');
    }

    // Update product's stock by adding the recommended quantity
    const updateProductQuery = 'UPDATE products SET stock = stock + ? WHERE id = ?';
    await pool.execute(updateProductQuery, [suggestion.recommendedQuantity, productId]);

    // Update suggestion status to ACCEPTED
    return await reorderSuggestionRepository.updateStatus(id, 'ACCEPTED');
  }

  async rejectSuggestion(id) {
    return await reorderSuggestionRepository.updateStatus(id, 'REJECTED');
  }
}

module.exports = new ReorderSuggestionService();