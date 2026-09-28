const productService = require('./productService');
const RuleBasedCommerceAdvisor = require('./ruleBasedCommerceAdvisor');
const pricingSuggestionService = require('./pricingSuggestionService');
const reorderSuggestionService = require('./reorderSuggestionService');

// Initialize the advisor
const advisor = new RuleBasedCommerceAdvisor();

// Get demand spike multiplier from environment variable or default to 3
const DEMAND_SPIKE_MULTIPLIER = parseFloat(process.env.DEMAND_SPIKE_MULTIPLIER) || 3;

/**
 * Handle demand-spike trigger asynchronously
 * @param {number} productId - The product ID to generate suggestions for
 */
async function handleDemandSpikeTrigger(productId) {
  console.log('DEMAND_SPIKE_TRIGGER_INVOKED', { productId });
  
  try {
    // Get the updated product
    const product = await productService.getProductById(productId);
    if (!product) {
      console.warn(`Product ${productId} not found for demand-spike trigger`);
      return;
    }

    // Check if demand velocity exceeds the spike threshold
    const productDemandVelocity = parseFloat(product.demand_velocity);
    const categoryAvgDemandVelocity = await advisor.calculateCategoryAverageDemandVelocity(product.category);
    const spikeThreshold = DEMAND_SPIKE_MULTIPLIER * categoryAvgDemandVelocity;
    
    console.log('DEMAND_SPIKE_CHECK', {
      productDemandVelocity,
      categoryAvgDemandVelocity,
      spikeThreshold,
      isSpiking: productDemandVelocity > spikeThreshold
    });
    
    if (productDemandVelocity <= spikeThreshold) {
      // Demand is not spiking, no need to trigger suggestions
      console.log('DEMAND_SPIKE_NOT_SPiking', { productId });
      return;
    }

    // Generate pricing suggestion if no pending one exists
    try {
      const hasPendingPricing = await pricingSuggestionService.hasPendingSuggestion(parseInt(productId), 'DEMAND_SPIKE');
      console.log('DEMAND_SPIKE_PRICING_PENDING_CHECK', { hasPendingPricing });
      
      if (!hasPendingPricing) {
        const recommendations = await advisor.getRecommendations(product);
        console.log('DEMAND_SPIKE_PRICING_RECOMMENDATIONS', recommendations.pricing);
        
        const pricingSuggestionData = {
          productId: parseInt(productId),
          currentPrice: Number(product.current_price),
          recommendedPrice: recommendations.pricing.suggestedPrice,
          direction: recommendations.pricing.direction,
          confidence: recommendations.pricing.confidence,
          reasoning: recommendations.pricing.reasoning,
          triggerReason: 'DEMAND_SPIKE'
        };

        console.log('DEMAND_SPIKE_CREATING_PRICING_SUGGESTION', pricingSuggestionData);
        await pricingSuggestionService.createSuggestion(pricingSuggestionData);
        console.log('DEMAND_SPIKE_PRICING_SUGGESTION_CREATED', { productId });
      }
    } catch (error) {
      console.error(`Error creating pricing suggestion for product ${productId}:`, error.message);
      console.error('Full error:', error);
    }

    // Generate reorder suggestion if no pending one exists
    try {
      const hasPendingReorder = await reorderSuggestionService.hasPendingSuggestion(parseInt(productId), 'DEMAND_SPIKE');
      console.log('DEMAND_SPIKE_REORDER_PENDING_CHECK', { hasPendingReorder });
      
      if (!hasPendingReorder) {
        const recommendations = await advisor.getRecommendations(product);
        console.log('DEMAND_SPIKE_REORDER_RECOMMENDATIONS', recommendations.reorder);
        
        const reorderSuggestionData = {
          productId: parseInt(productId),
          currentStock: parseInt(product.stock),
          recommendedQuantity: Math.max(1, Math.floor(recommendations.reorder.suggestedQuantity)),
          suggestedLeadTimeDays: 7, // Default lead time
          confidence: recommendations.reorder.confidence,
          reasoning: recommendations.reorder.reasoning,
          triggerReason: 'DEMAND_SPIKE'
        };

        console.log('DEMAND_SPIKE_CREATING_REORDER_SUGGESTION', reorderSuggestionData);
        await reorderSuggestionService.createSuggestion(reorderSuggestionData);
        console.log('DEMAND_SPIKE_REORDER_SUGGESTION_CREATED', { productId });
      }
    } catch (error) {
      console.error(`Error creating reorder suggestion for product ${productId}:`, error.message);
      console.error('Full error:', error);
    }

  } catch (error) {
    // Log error but don't throw - this is background processing
    console.error(`Error in demand-spike trigger for product ${productId}:`, error.message);
    console.error('Full error:', error);
  }
}

module.exports = { handleDemandSpikeTrigger, DEMAND_SPIKE_MULTIPLIER };