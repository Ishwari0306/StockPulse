const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const RuleBasedCommerceAdvisor = require('../services/ruleBasedCommerceAdvisor');
const pricingSuggestionService = require('../services/pricingSuggestionService');
const reorderSuggestionService = require('../services/reorderSuggestionService');
const { handleInventoryLowTrigger } = require('../services/inventoryLowTrigger');
const { handleDemandSpikeTrigger, DEMAND_SPIKE_MULTIPLIER } = require('../services/demandSpikeTrigger');

// Initialize the advisor
const advisor = new RuleBasedCommerceAdvisor();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    // Get all products
    let products = await productService.getAllProducts();
    
    // Apply filters if provided
    if (status) {
      products = products.filter(product => product.lifecycle === status);
    }
    
    if (category) {
      products = products.filter(product => product.category === category);
    }
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const productData = req.body;
    
    // Validate required fields
    if (!productData.sku || !productData.name || !productData.category || 
        productData.currentPrice === undefined || productData.stock === undefined ||
        productData.reorderThreshold === undefined || productData.demandVelocity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate category
    const validCategories = ['ELECTRONICS', 'APPAREL', 'HOME'];
    if (!validCategories.includes(productData.category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Validate lifecycle if provided
    if (productData.lifecycle) {
      const validLifecycles = ['ACTIVE', 'PRICE_REVIEW_PENDING', 'OUT_OF_STOCK'];
      if (!validLifecycles.includes(productData.lifecycle)) {
        return res.status(400).json({ error: 'Invalid lifecycle' });
      }
    }
    
    // Validate numeric fields
    if (productData.currentPrice < 0 || productData.stock < 0 || 
        productData.reorderThreshold < 0 || productData.demandVelocity < 0) {
      return res.status(400).json({ error: 'Numeric fields must be non-negative' });
    }
    
    // Check if product with SKU already exists
    const existingProduct = await productService.getProductBySku(productData.sku);
    if (existingProduct) {
      return res.status(409).json({ error: 'Product with this SKU already exists' });
    }
    
    // Create product
    const product = await productService.createProduct(productData);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/products/:id/stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    
    // Validate stock
    if (stock === undefined) {
      return res.status(400).json({ error: 'Stock field is required' });
    }
    
    if (stock < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }
    
    // Check if product exists
    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update stock
    const updatedProduct = await productService.updateProduct(id, { stock });
    
    // Trigger inventory-low handler asynchronously without waiting
    // Only trigger if new stock is less than reorder threshold
    // Parse both values to ensure proper numeric comparison
    if (parseInt(stock) < parseInt(existingProduct.reorder_threshold)) {
      // Fire and forget - don't await
      setImmediate(() => {
        handleInventoryLowTrigger(parseInt(id));
      });
    }
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/products/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if product exists
    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Validate numeric fields if provided
    if (updateData.currentPrice !== undefined && updateData.currentPrice < 0) {
      return res.status(400).json({ error: 'currentPrice cannot be negative' });
    }
    
    if (updateData.stock !== undefined && updateData.stock < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }
    
    if (updateData.reorderThreshold !== undefined && updateData.reorderThreshold < 0) {
      return res.status(400).json({ error: 'reorderThreshold cannot be negative' });
    }
    
    if (updateData.demandVelocity !== undefined && updateData.demandVelocity < 0) {
      return res.status(400).json({ error: 'demandVelocity cannot be negative' });
    }
    
    // Validate category if provided
    if (updateData.category) {
      const validCategories = ['ELECTRONICS', 'APPAREL', 'HOME'];
      if (!validCategories.includes(updateData.category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }
    
    // Validate lifecycle if provided
    if (updateData.lifecycle) {
      const validLifecycles = ['ACTIVE', 'PRICE_REVIEW_PENDING', 'OUT_OF_STOCK'];
      if (!validLifecycles.includes(updateData.lifecycle)) {
        return res.status(400).json({ error: 'Invalid lifecycle' });
      }
    }
    
    // If stock is being updated to 0, set lifecycle to OUT_OF_STOCK
    if (updateData.stock === 0) {
      updateData.lifecycle = 'OUT_OF_STOCK';
    }
    
    // Update product
    const updatedProduct = await productService.updateProduct(id, updateData);
    
    // Trigger handlers asynchronously without waiting
    
    // Trigger inventory-low handler if stock was updated and is now low
    if (updateData.stock !== undefined) {
      if (parseInt(updateData.stock) < parseInt(existingProduct.reorder_threshold)) {
        // Fire and forget - don't await
        setImmediate(() => {
          handleInventoryLowTrigger(parseInt(id));
        });
      }
    }
    
    // Trigger demand-spike handler if demand velocity was updated and is now spiking
    if (updateData.demandVelocity !== undefined) {
      console.log('DEMAND_SPIKE_SCHEDULE_CHECK', { 
        productId: id, 
        updatedDemandVelocity: updateData.demandVelocity 
      });
      // Schedule demand spike check after a short delay to ensure update is committed
      setTimeout(() => {
        console.log('DEMAND_SPIKE_TIMEOUT_EXECUTING', { productId: id });
        // Wrap the async operation in a self-invoking async function
        (async () => {
          try {
            const product = await productService.getProductById(id);
            if (product) {
              const productDemandVelocity = parseFloat(product.demand_velocity);
              const categoryAvgDemandVelocity = await advisor.calculateCategoryAverageDemandVelocity(product.category);
              const spikeThreshold = parseFloat(process.env.DEMAND_SPIKE_MULTIPLIER || 3) * categoryAvgDemandVelocity;
              
              if (productDemandVelocity > spikeThreshold) {
                console.log('DEMAND_SPIKE_CALLING_HANDLER', { productId: id });
                handleDemandSpikeTrigger(parseInt(id));
              } else {
                console.log('DEMAND_SPIKE_THRESHOLD_NOT_MET', { 
                  productId: id, 
                  productDemandVelocity, 
                  spikeThreshold 
                });
              }
            }
          } catch (error) {
            console.error(`Error checking demand spike for product ${id}:`, error.message);
            console.error('Full error:', error);
          }
        })();
    }, 50);
    }
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products/:id/orders
router.post('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    // Validate quantity
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity field is required' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    
    // Check if product exists
    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if enough stock
    if (existingProduct.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    // Reduce stock
    const newStock = existingProduct.stock - quantity;
    const updatedProduct = await productService.updateProduct(id, { stock: newStock });
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id/recommendations
router.get('/:id/recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get recommendations
    const recommendations = await advisor.getRecommendations(product);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products/:id/suggest-pricing
router.post('/:id/suggest-pricing', async (req, res) => {
  try {
    const { id } = req.params;
    const { triggerReason = 'MANUAL' } = req.body;

    // Validate trigger reason
    const validTriggerReasons = ['INITIAL', 'INVENTORY_LOW', 'DEMAND_SPIKE', 'MANUAL'];
    if (!validTriggerReasons.includes(triggerReason)) {
      return res.status(400).json({ error: 'Invalid trigger reason' });
    }

    // Check if product exists
    const product = await productService.getProductById(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for existing pending suggestion
    const hasPending = await pricingSuggestionService.hasPendingSuggestion(id, triggerReason);
    if (hasPending) {
      return res.status(409).json({ error: 'Pending pricing suggestion already exists for this product and trigger reason' });
    }

    // Get recommendations from advisor
    const recommendations = await advisor.getRecommendations(product);
    
    // Create pricing suggestion
    const suggestionData = {
      productId: id,
      currentPrice: Number(product.currentPrice ?? product.current_price),
      recommendedPrice: recommendations.pricing.suggestedPrice,
      direction: recommendations.pricing.direction,
      confidence: recommendations.pricing.confidence,
      reasoning: recommendations.pricing.reasoning,
      triggerReason
    };

    const suggestion = await pricingSuggestionService.createSuggestion(suggestionData);
    res.status(201).json(suggestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products/:id/suggest-reorder
router.post('/:id/suggest-reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { triggerReason = 'MANUAL' } = req.body;

    // Validate trigger reason
    const validTriggerReasons = ['INITIAL', 'INVENTORY_LOW', 'DEMAND_SPIKE', 'MANUAL'];
    if (!validTriggerReasons.includes(triggerReason)) {
      return res.status(400).json({ error: 'Invalid trigger reason' });
    }

    // Check if product exists
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for existing pending suggestion
    const hasPending = await reorderSuggestionService.hasPendingSuggestion(id, triggerReason);
    if (hasPending) {
      return res.status(409).json({ error: 'Pending reorder suggestion already exists for this product and trigger reason' });
    }

    // Get recommendations from advisor
    const recommendations = await advisor.getRecommendations(product);

    // Validate recommended quantity
    if (recommendations.reorder.suggestedQuantity <= 0) {
      return res.status(400).json({ error: 'Recommended quantity must be positive' });
    }

    // Create reorder suggestion
    const suggestionData = {
      productId: id,
      currentStock: product.stock,
      recommendedQuantity: recommendations.reorder.suggestedQuantity,
      suggestedLeadTimeDays: 7, // Default lead time
      confidence: recommendations.reorder.confidence,
      reasoning: recommendations.reorder.reasoning,
      triggerReason
    };

    const suggestion = await reorderSuggestionService.createSuggestion(suggestionData);
    res.status(201).json(suggestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/products/:id - General product update that can detect demand spikes
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate numeric fields if provided
    if (updateData.currentPrice !== undefined && updateData.currentPrice < 0) {
      return res.status(400).json({ error: 'Current price cannot be negative' });
    }
    
    if (updateData.stock !== undefined && updateData.stock < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }
    
    if (updateData.reorderThreshold !== undefined && updateData.reorderThreshold < 0) {
      return res.status(400).json({ error: 'Reorder threshold cannot be negative' });
    }
    
    if (updateData.demandVelocity !== undefined && updateData.demandVelocity < 0) {
      return res.status(400).json({ error: 'Demand velocity cannot be negative' });
    }

    // Update product
    const updatedProduct = await productService.updateProduct(id, updateData);
    
    // Check if demandVelocity was updated and if it triggers a demand spike
    if (updateData.demandVelocity !== undefined) {
      const newDemandVelocity = parseFloat(updateData.demandVelocity);
      const categoryAvgDemandVelocity = await advisor.calculateCategoryAverageDemandVelocity(updatedProduct.category);
      const DEMAND_SPIKE_MULTIPLIER = parseFloat(process.env.DEMAND_SPIKE_MULTIPLIER) || 3;
      const spikeThreshold = DEMAND_SPIKE_MULTIPLIER * categoryAvgDemandVelocity;
      
      if (newDemandVelocity > spikeThreshold) {
        // Fire and forget - don't await
        setImmediate(() => handleDemandSpikeTrigger(id));
      }
    }
    
    // Also check for inventory low if stock was updated
    if (updateData.stock !== undefined) {
      if (parseInt(updateData.stock) < parseInt(updatedProduct.reorder_threshold)) {
        // Fire and forget - don't await
        setImmediate(() => handleInventoryLowTrigger(id));
      }
    }
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;