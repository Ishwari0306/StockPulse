const { pool } = require('../config/db');

class PricingSuggestionRepository {
  // Create a new pricing suggestion
  async create(suggestionData) {
    const {
      productId,
      currentPrice,
      recommendedPrice,
      direction,
      confidence,
      reasoning,
      triggerReason
    } = suggestionData;

    // Validate that all required fields are defined
    if (
      productId === undefined ||
      currentPrice === undefined ||
      recommendedPrice === undefined ||
      direction === undefined ||
      confidence === undefined ||
      reasoning === undefined ||
      triggerReason === undefined
    ) {
      throw new Error('Pricing suggestion contains an undefined required field');
    }

    const query = `
      INSERT INTO pricing_suggestions 
      (product_id, current_price, recommended_price, direction, confidence, reasoning, trigger_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      productId,
      currentPrice,
      recommendedPrice,
      direction,
      confidence,
      reasoning,
      triggerReason
    ];

    try {
      const [result] = await pool.execute(query, values);
      return await this.getById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Get pricing suggestion by ID
  async getById(id) {
    const query = 'SELECT * FROM pricing_suggestions WHERE id = ?';
    
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get pricing suggestions by product ID
  async getByProductId(productId) {
    const query = 'SELECT * FROM pricing_suggestions WHERE product_id = ? ORDER BY created_at DESC';
    
    try {
      const [rows] = await pool.execute(query, [productId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Check if pending suggestion exists for product + trigger reason combination
  async hasPendingSuggestion(productId, triggerReason) {
    const query = `
      SELECT COUNT(*) as count 
      FROM pricing_suggestions 
      WHERE product_id = ? AND trigger_reason = ? AND status = 'PENDING'
    `;
    
    try {
      const [rows] = await pool.execute(query, [productId, triggerReason]);
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update pricing suggestion status
  async updateStatus(id, status) {
    const query = 'UPDATE pricing_suggestions SET status = ? WHERE id = ?';
    
    try {
      await pool.execute(query, [status, id]);
      return await this.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Map database row to suggestion object with proper field names
  mapRowToSuggestion(row) {
    if (!row) return null;
    
    return {
      id: row.id,
      productId: row.product_id,
      currentPrice: row.current_price,
      recommendedPrice: row.recommended_price,
      direction: row.direction,
      confidence: row.confidence,
      reasoning: row.reasoning,
      status: row.status,
      triggerReason: row.trigger_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = new PricingSuggestionRepository();