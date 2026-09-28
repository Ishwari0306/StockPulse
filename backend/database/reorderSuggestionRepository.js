const { pool } = require('../config/db');

class ReorderSuggestionRepository {
  // Create a new reorder suggestion
  async create(suggestionData) {
    const { productId, currentStock, recommendedQuantity, suggestedLeadTimeDays, confidence, reasoning, triggerReason } = suggestionData;
    
    const query = `
      INSERT INTO reorder_suggestions 
      (product_id, current_stock, recommended_quantity, suggested_lead_time_days, confidence, reasoning, trigger_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [productId, currentStock, recommendedQuantity, suggestedLeadTimeDays || 7, confidence, reasoning, triggerReason];
    
    try {
      const [result] = await pool.execute(query, values);
      return await this.getById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Get reorder suggestion by ID
  async getById(id) {
    const query = 'SELECT * FROM reorder_suggestions WHERE id = ?';
    
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get reorder suggestions by product ID
  async getByProductId(productId) {
    const query = 'SELECT * FROM reorder_suggestions WHERE product_id = ? ORDER BY created_at DESC';
    
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
      FROM reorder_suggestions 
      WHERE product_id = ? AND trigger_reason = ? AND status = 'PENDING'
    `;
    
    try {
      const [rows] = await pool.execute(query, [productId, triggerReason]);
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update reorder suggestion status
  async updateStatus(id, status) {
    const query = 'UPDATE reorder_suggestions SET status = ? WHERE id = ?';
    
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
      currentStock: row.current_stock,
      recommendedQuantity: row.recommended_quantity,
      suggestedLeadTimeDays: row.suggested_lead_time_days,
      confidence: row.confidence,
      reasoning: row.reasoning,
      status: row.status,
      triggerReason: row.trigger_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = new ReorderSuggestionRepository();