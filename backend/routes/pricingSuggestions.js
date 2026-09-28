const express = require('express');
const router = express.Router();
const pricingSuggestionService = require('../services/pricingSuggestionService');

// PATCH /api/pricing-suggestions/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, productId } = req.body;

    // Validate request body
    if (!status || !productId) {
      return res.status(400).json({ error: 'Status and productId are required' });
    }

    // Validate status
    const validStatuses = ['ACCEPTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status must be ACCEPTED or REJECTED' });
    }

    // Get suggestion to verify it exists
    const suggestion = await pricingSuggestionService.getSuggestionById(id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Pricing suggestion not found' });
    }

    if (status === 'ACCEPTED') {
      // Process acceptance - update product price and mark suggestion as accepted
      const updatedSuggestion = await pricingSuggestionService.acceptSuggestion(id, productId);
      res.json(updatedSuggestion);
    } else {
      // Process rejection - just mark suggestion as rejected
      const updatedSuggestion = await pricingSuggestionService.rejectSuggestion(id);
      res.json(updatedSuggestion);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;