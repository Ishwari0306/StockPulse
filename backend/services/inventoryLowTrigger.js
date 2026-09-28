const productService = require('./productService');
const RuleBasedCommerceAdvisor = require('./ruleBasedCommerceAdvisor');
const pricingSuggestionService = require('./pricingSuggestionService');
const reorderSuggestionService = require('./reorderSuggestionService');

// Initialize the advisor
const advisor = new RuleBasedCommerceAdvisor();

/**
 * Handle inventory-low trigger asynchronously
 * @param {number} productId - The product ID to generate suggestions for
 */
async function handleInventoryLowTrigger(productId) {
  try {
    // Get the updated product
    const product = await productService.getProductById(productId);
    if (!product) {
      console.warn(`Product ${productId} not found for inventory-low trigger`);
      return;
    }

    // Check if stock is less than reorder threshold
    const stock = parseInt(product.stock);
    const reorderThreshold = parseInt(product.reorder_threshold);
    
    if (stock >= reorderThreshold) {
      // Stock is sufficient, no need to trigger suggestions
      return;
    }

    // Generate pricing suggestion if no pending one exists
    try {
      const hasPendingPricing = await pricingSuggestionService.hasPendingSuggestion(parseInt(productId), 'INVENTORY_LOW');
      if (!hasPendingPricing) {
        const recommendations = await advisor.getRecommendations(product);
        
        const pricingSuggestionData = {
          productId: parseInt(productId),
          currentPrice: Number(product.current_price ?? product.currentPrice),
          recommendedPrice: recommendations.pricing.suggestedPrice,
          direction: recommendations.pricing.direction,
          confidence: recommendations.pricing.confidence,
          reasoning: recommendations.pricing.reasoning,
          triggerReason: 'INVENTORY_LOW'
        };

        await pricingSuggestionService.createSuggestion(pricingSuggestionData);
      }
    } catch (error) {
      console.error(`Error creating pricing suggestion for product ${productId}:`, error.message);
    }

    // Generate reorder suggestion if no pending one exists
    try {
      const hasPendingReorder = await reorderSuggestionService.hasPendingSuggestion(parseInt(productId), 'INVENTORY_LOW');
      if (!hasPendingReorder) {
        const recommendations = await advisor.getRecommendations(product);
        
        const reorderSuggestionData = {
          productId: parseInt(productId),
          currentStock: parseInt(product.stock),
          recommendedQuantity: Math.max(1, Math.floor(recommendations.reorder.suggestedQuantity)),
          suggestedLeadTimeDays: 7, // Default lead time
          confidence: recommendations.reorder.confidence,
          reasoning: recommendations.reorder.reasoning,
          triggerReason: 'INVENTORY_LOW'
        };

        await reorderSuggestionService.createSuggestion(reorderSuggestionData);
      }
    } catch (error) {
      console.error(`Error creating reorder suggestion for product ${productId}:`, error.message);
    }

  } catch (error) {
    // Log error but don't throw - this is background processing
    console.error(`Error in inventory-low trigger for product ${productId}:`, error.message);
  }
}

module.exports = { handleInventoryLowTrigger };