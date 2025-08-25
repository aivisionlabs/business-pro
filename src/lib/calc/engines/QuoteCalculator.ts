import {
  BusinessCase,
  Sku,
  CustomerQuote,
  QuoteSkuItem,
  QuoteGenerationInput,
  QuoteOptimizationInput,
  QuoteOptimizationResult,
  QuoteLineItem,
} from "@/lib/types";
import { calculateScenario } from "@/lib/calc";
import { toKg } from "../utils";

/**
 * QuoteCalculator - Converts business case inputs into customer quotations
 * and provides optimization functionality for pricing
 */
export class QuoteCalculator {

  // ============================================================================
  // QUOTE GENERATION
  // ============================================================================

  /**
 * Generate a customer quote from business case data
 */
  static generateQuote(input: QuoteGenerationInput): CustomerQuote {
    const { businessCase, selectedSkuIds, gstRate = 0.18, quoteName, defaultQuantities = {} } = input;

    // Determine which SKUs to include (all if none specified)
    const skusToInclude = selectedSkuIds?.length
      ? businessCase.skus.filter(sku => selectedSkuIds.includes(sku.id))
      : businessCase.skus;

    if (skusToInclude.length === 0) {
      throw new Error('No SKUs found to include in quote');
    }

    // Calculate the business case to get current pricing
    const calc = calculateScenario(businessCase);

    // Build quote items for each SKU
    const skuItems = skusToInclude.map(sku => {
      const skuCalc = calc.bySku?.find(s => s.skuId === sku.id);
      if (!skuCalc) {
        throw new Error(`SKU calculation not found for ${sku.id}`);
      }

      // Use Year 1 pricing as base for quote
      const year1Price = skuCalc.prices[0];
      const productWeightKg = toKg(sku.sales.productWeightGrams);

      // Build quote components from business case inputs
      const components = this.buildQuoteComponents(sku, year1Price, productWeightKg);

      // Calculate totals for this SKU
      const totalExclGst = this.calculateTotalExclGst(components);
      const gst = this.calculateGst(totalExclGst, gstRate);
      const totalInclGst = this.calculateTotalInclGst(totalExclGst, gst);

      return {
        skuId: sku.id,
        skuName: sku.name,
        included: true, // All selected SKUs are included by default
        quantity: defaultQuantities[sku.id] || 1, // Default quantity of 1
        components,
        totalExclGst,
        gst,
        totalInclGst,
      };
    });

    // Calculate aggregated totals across all included SKUs
    const aggregatedTotals = this.calculateAggregatedTotals(skuItems, gstRate);

    const quote: CustomerQuote = {
      id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      businessCaseId: businessCase.id,
      quoteName: quoteName || `Quote for ${businessCase.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      skuItems,
      aggregatedTotals,
      gstRate,
      optimizationMode: 'none',
      editableComponents: {
        resin: true,
        mb: true,
        wastage: false, // Per requirements, initially nil
        packaging: true,
        freight: true,
        mouldAmortisation: false, // Per requirements, initially nil
        conversionCharge: true,
        discount: false, // Per requirements, initially nil
      },
    };

    return quote;
  }

  /**
   * Build quote components from business case data
   */
  private static buildQuoteComponents(
    sku: Sku,
    year1Price: any,
    productWeightKg: number
  ): QuoteSkuItem['components'] {

    // Extract pricing components
    const resinRsPerKg = year1Price.perKg.rmPerKg;
    const mbRsPerKg = year1Price.perKg.mbPerKg;
    const packagingRsPerKg = year1Price.perKg.packagingPerKg;
    const freightRsPerKg = year1Price.perKg.freightOutPerKg;
    const conversionChargeRsPerKg = year1Price.perKg.conversionPerKg;

    // Convert per-kg to per-piece
    const resinRsPerPiece = resinRsPerKg * productWeightKg;
    const mbRsPerPiece = mbRsPerKg * productWeightKg;
    const packagingRsPerPiece = packagingRsPerKg * productWeightKg;
    const freightRsPerPiece = freightRsPerKg * productWeightKg;
    const conversionChargeRsPerPiece = conversionChargeRsPerKg * productWeightKg;

    return {
      resin: {
        rsPerPiece: resinRsPerPiece,
        rsPerKg: resinRsPerKg,
      },
      mb: {
        rsPerPiece: mbRsPerPiece,
        rsPerKg: mbRsPerKg,
      },
      wastage: {
        rsPerPiece: 0, // Initially nil per requirements
        rsPerKg: 0,
      },
      packaging: {
        rsPerPiece: packagingRsPerPiece,
        rsPerKg: packagingRsPerKg,
      },
      freight: {
        rsPerPiece: freightRsPerPiece,
        rsPerKg: freightRsPerKg,
      },
      mouldAmortisation: {
        rsPerPiece: 0, // Initially nil per requirements
        rsPerKg: 0,
      },
      conversionCharge: {
        rsPerPiece: conversionChargeRsPerPiece,
        rsPerKg: conversionChargeRsPerKg,
      },
      discount: {
        rsPerPiece: 0, // Initially nil per requirements
        rsPerKg: 0,
      },
    };
  }

  /**
   * Calculate total excluding GST
   */
  private static calculateTotalExclGst(components: QuoteSkuItem['components']): QuoteLineItem {
    const rsPerPiece =
      components.resin.rsPerPiece +
      components.mb.rsPerPiece +
      components.wastage.rsPerPiece +
      components.packaging.rsPerPiece +
      components.freight.rsPerPiece +
      components.mouldAmortisation.rsPerPiece +
      components.conversionCharge.rsPerPiece -
      components.discount.rsPerPiece; // Discount is subtracted

    const rsPerKg =
      components.resin.rsPerKg +
      components.mb.rsPerKg +
      components.wastage.rsPerKg +
      components.packaging.rsPerKg +
      components.freight.rsPerKg +
      components.mouldAmortisation.rsPerKg +
      components.conversionCharge.rsPerKg -
      components.discount.rsPerKg;

    return { rsPerPiece, rsPerKg };
  }

  /**
   * Calculate GST
   */
  private static calculateGst(totalExclGst: QuoteLineItem, gstRate: number): QuoteLineItem {
    return {
      rsPerPiece: totalExclGst.rsPerPiece * gstRate,
      rsPerKg: totalExclGst.rsPerKg * gstRate,
    };
  }

  /**
   * Calculate total including GST
   */
  private static calculateTotalInclGst(totalExclGst: QuoteLineItem, gst: QuoteLineItem): QuoteLineItem {
    return {
      rsPerPiece: totalExclGst.rsPerPiece + gst.rsPerPiece,
      rsPerKg: totalExclGst.rsPerKg + gst.rsPerKg,
    };
  }

  /**
   * Calculate aggregated totals across all included SKUs
   */
  private static calculateAggregatedTotals(skuItems: any[], gstRate: number): any {
    let totalExclGstRsPerPiece = 0;
    let totalExclGstRsPerKg = 0;
    let totalWeight = 0;

    // Sum up totals from all included SKUs
    skuItems.forEach(item => {
      if (item.included) {
        totalExclGstRsPerPiece += item.totalExclGst.rsPerPiece * item.quantity;

        // For per-kg calculations, we need to weight by quantity and weight
        const itemWeight = item.totalExclGst.rsPerPiece / Math.max(0.001, item.totalExclGst.rsPerKg);
        const totalItemWeight = itemWeight * item.quantity;
        totalWeight += totalItemWeight;
        totalExclGstRsPerKg += item.totalExclGst.rsPerKg * totalItemWeight;
      }
    });

    // Calculate weighted average per kg
    const avgRsPerKg = totalWeight > 0 ? totalExclGstRsPerKg / totalWeight : 0;

    const totalExclGst = {
      rsPerPiece: totalExclGstRsPerPiece,
      rsPerKg: avgRsPerKg,
    };

    const gst = this.calculateGst(totalExclGst, gstRate);
    const totalInclGst = this.calculateTotalInclGst(totalExclGst, gst);

    return {
      totalExclGst,
      gst,
      totalInclGst,
    };
  }

  // ============================================================================
  // QUOTE OPTIMIZATION
  // ============================================================================

  /**
   * Optimize quote to achieve target NPV/IRR
   */
  static optimizeQuote(input: QuoteOptimizationInput): QuoteOptimizationResult {
    const { quote, businessCase, targetNpv, targetIrr, optimizationMode } = input;

    // Validation
    if (!targetNpv && !targetIrr) {
      throw new Error("Either targetNpv or targetIrr must be provided");
    }

    if (optimizationMode === 'conversion_only') {
      return this.optimizeConversionChargeOnly(quote, businessCase, targetNpv, targetIrr);
    } else if (optimizationMode === 'all_components') {
      return this.optimizeAllComponents(quote, businessCase, targetNpv, targetIrr);
    } else {
      throw new Error(`Invalid optimization mode: ${optimizationMode}`);
    }
  }

  /**
   * Optimize only the conversion charge to meet target
   */
  private static optimizeConversionChargeOnly(
    quote: CustomerQuote,
    businessCase: BusinessCase,
    targetNpv?: number,
    targetIrr?: number
  ): QuoteOptimizationResult {
    const maxIterations = 100;
    const tolerance = 1e-6;
    let iterations = 0;
    let converged = false;


    // Get the current business case
    const currentQuote = { ...quote };
    let bestQuote = { ...quote };
    let bestError = Number.MAX_VALUE;

    // Binary search bounds for conversion charge adjustment
    let minMultiplier = 0.1; // Minimum 10% of original
    let maxMultiplier = 10.0; // Maximum 1000% of original

    // Get original conversion charge from first included SKU as reference
    const firstIncludedSku = quote.skuItems.find(item => item.included);
    if (!firstIncludedSku) {
      throw new Error('No SKUs included in quote for optimization');
    }
    const originalConversionCharge = firstIncludedSku.components.conversionCharge.rsPerKg;

    while (iterations < maxIterations && !converged) {
      iterations++;

      const midMultiplier = (minMultiplier + maxMultiplier) / 2;
      const newConversionChargePerKg = originalConversionCharge * midMultiplier;

      // Update quote with new conversion charge
      const testQuote = this.updateQuoteConversionCharge(currentQuote, newConversionChargePerKg);

      // Calculate metrics for this quote
      const metrics = this.calculateQuoteMetrics(testQuote, businessCase);

      let error = 0;
      if (targetNpv !== undefined) {
        error = Math.abs(metrics.npv - targetNpv) / Math.abs(targetNpv);
      } else if (targetIrr !== undefined && metrics.irr !== null) {
        error = Math.abs(metrics.irr - targetIrr) / Math.abs(targetIrr);
      }

      if (error < bestError) {
        bestError = error;
        bestQuote = { ...testQuote };
      }



      if (error < tolerance) {
        converged = true;
        break;
      }

      // Adjust search bounds
      if (targetNpv !== undefined) {
        if (metrics.npv < targetNpv) {
          minMultiplier = midMultiplier; // Need higher conversion charge
        } else {
          maxMultiplier = midMultiplier; // Need lower conversion charge
        }
      } else if (targetIrr !== undefined && metrics.irr !== null) {
        if (metrics.irr < targetIrr) {
          minMultiplier = midMultiplier; // Need higher conversion charge
        } else {
          maxMultiplier = midMultiplier; // Need lower conversion charge
        }
      }
    }

    const finalMetrics = this.calculateQuoteMetrics(bestQuote, businessCase);

    return {
      optimizedQuote: bestQuote,
      achievedNpv: finalMetrics.npv,
      achievedIrr: finalMetrics.irr,
      convergenceInfo: {
        converged,
        iterations,
        finalError: bestError,
      },
    };
  }

  /**
   * Optimize all components (except conversion charge) to meet target
   */
  private static optimizeAllComponents(
    quote: CustomerQuote,
    businessCase: BusinessCase,
    targetNpv?: number,
    targetIrr?: number
  ): QuoteOptimizationResult {
    const maxIterations = 100;
    const tolerance = 1e-6;
    let iterations = 0;
    let converged = false;


    const currentQuote = { ...quote };
    let bestQuote = { ...quote };
    let bestError = Number.MAX_VALUE;

    // Get original component values from first included SKU as reference
    const firstIncludedSku = quote.skuItems.find(item => item.included);
    if (!firstIncludedSku) {
      throw new Error('No SKUs included in quote for optimization');
    }

    // Store original values for components that can be adjusted
    const originalComponents = {
      resin: firstIncludedSku.components.resin.rsPerKg,
      mb: firstIncludedSku.components.mb.rsPerKg,
      wastage: firstIncludedSku.components.wastage.rsPerKg,
      packaging: firstIncludedSku.components.packaging.rsPerKg,
      freight: firstIncludedSku.components.freight.rsPerKg,
      mouldAmortisation: firstIncludedSku.components.mouldAmortisation.rsPerKg,
      discount: firstIncludedSku.components.discount.rsPerKg,
    };

    // Binary search bounds for overall multiplier
    let minMultiplier = 0.5; // Minimum 50% of original
    let maxMultiplier = 3.0; // Maximum 300% of original

    while (iterations < maxIterations && !converged) {
      iterations++;

      const midMultiplier = (minMultiplier + maxMultiplier) / 2;

      // Update quote with new component values (excluding conversion charge)
      const testQuote = this.updateQuoteAllComponents(currentQuote, originalComponents, midMultiplier);

      // Calculate metrics for this quote
      const metrics = this.calculateQuoteMetrics(testQuote, businessCase);

      let error = 0;
      if (targetNpv !== undefined) {
        error = Math.abs(metrics.npv - targetNpv) / Math.abs(targetNpv);
      } else if (targetIrr !== undefined && metrics.irr !== null) {
        error = Math.abs(metrics.irr - targetIrr) / Math.abs(targetIrr);
      }

      if (error < bestError) {
        bestError = error;
        bestQuote = { ...testQuote };
      }



      if (error < tolerance) {
        converged = true;
        break;
      }

      // Adjust search bounds
      if (targetNpv !== undefined) {
        if (metrics.npv < targetNpv) {
          minMultiplier = midMultiplier; // Need higher prices
        } else {
          maxMultiplier = midMultiplier; // Need lower prices
        }
      } else if (targetIrr !== undefined && metrics.irr !== null) {
        if (metrics.irr < targetIrr) {
          minMultiplier = midMultiplier; // Need higher prices
        } else {
          maxMultiplier = midMultiplier; // Need lower prices
        }
      }
    }

    const finalMetrics = this.calculateQuoteMetrics(bestQuote, businessCase);

    return {
      optimizedQuote: bestQuote,
      achievedNpv: finalMetrics.npv,
      achievedIrr: finalMetrics.irr,
      convergenceInfo: {
        converged,
        iterations,
        finalError: bestError,
      },
    };
  }

  /**
 * Update quote with new conversion charge
 */
  private static updateQuoteConversionCharge(quote: CustomerQuote, newConversionChargePerKg: number): CustomerQuote {
    const updatedQuote = { ...quote };

    // Update conversion charge for all SKU items
    updatedQuote.skuItems = quote.skuItems.map(skuItem => {
      if (!skuItem.included) return skuItem;

      // Calculate product weight to convert per-kg to per-piece
      const productWeightKg = skuItem.components.resin.rsPerPiece / Math.max(0.001, skuItem.components.resin.rsPerKg);

      const updatedComponents = {
        ...skuItem.components,
        conversionCharge: {
          rsPerKg: newConversionChargePerKg,
          rsPerPiece: newConversionChargePerKg * productWeightKg,
        },
      };

      // Recalculate totals for this SKU
      const totalExclGst = this.calculateTotalExclGst(updatedComponents);
      const gst = this.calculateGst(totalExclGst, quote.gstRate);
      const totalInclGst = this.calculateTotalInclGst(totalExclGst, gst);

      return {
        ...skuItem,
        components: updatedComponents,
        totalExclGst,
        gst,
        totalInclGst,
      };
    });

    // Recalculate aggregated totals
    updatedQuote.aggregatedTotals = this.calculateAggregatedTotals(updatedQuote.skuItems, quote.gstRate);
    updatedQuote.updatedAt = new Date().toISOString();

    return updatedQuote;
  }

  /**
 * Update quote with new component values (excluding conversion charge)
 */
  private static updateQuoteAllComponents(
    quote: CustomerQuote,
    originalComponents: any,
    multiplier: number
  ): CustomerQuote {
    const updatedQuote = { ...quote };

    // Update all components for all SKU items (excluding conversion charge)
    updatedQuote.skuItems = quote.skuItems.map(skuItem => {
      if (!skuItem.included) return skuItem;

      // Calculate product weight to convert per-kg to per-piece
      const productWeightKg = skuItem.components.resin.rsPerPiece / Math.max(0.001, skuItem.components.resin.rsPerKg);

      const updatedComponents = {
        ...skuItem.components,
        resin: {
          rsPerKg: skuItem.components.resin.rsPerKg * multiplier,
          rsPerPiece: skuItem.components.resin.rsPerPiece * multiplier,
        },
        mb: {
          rsPerKg: skuItem.components.mb.rsPerKg * multiplier,
          rsPerPiece: skuItem.components.mb.rsPerPiece * multiplier,
        },
        wastage: {
          rsPerKg: skuItem.components.wastage.rsPerKg * multiplier,
          rsPerPiece: skuItem.components.wastage.rsPerPiece * multiplier,
        },
        packaging: {
          rsPerKg: skuItem.components.packaging.rsPerKg * multiplier,
          rsPerPiece: skuItem.components.packaging.rsPerPiece * multiplier,
        },
        freight: {
          rsPerKg: skuItem.components.freight.rsPerKg * multiplier,
          rsPerPiece: skuItem.components.freight.rsPerPiece * multiplier,
        },
        mouldAmortisation: {
          rsPerKg: skuItem.components.mouldAmortisation.rsPerKg * multiplier,
          rsPerPiece: skuItem.components.mouldAmortisation.rsPerPiece * multiplier,
        },
        discount: {
          rsPerKg: skuItem.components.discount.rsPerKg * multiplier,
          rsPerPiece: skuItem.components.discount.rsPerPiece * multiplier,
        },
        // Keep conversion charge unchanged
        conversionCharge: skuItem.components.conversionCharge,
      };

      // Recalculate totals for this SKU
      const totalExclGst = this.calculateTotalExclGst(updatedComponents);
      const gst = this.calculateGst(totalExclGst, quote.gstRate);
      const totalInclGst = this.calculateTotalInclGst(totalExclGst, gst);

      return {
        ...skuItem,
        components: updatedComponents,
        totalExclGst,
        gst,
        totalInclGst,
      };
    });

    // Recalculate aggregated totals
    updatedQuote.aggregatedTotals = this.calculateAggregatedTotals(updatedQuote.skuItems, quote.gstRate);
    updatedQuote.updatedAt = new Date().toISOString();

    return updatedQuote;
  }

  /**
   * Calculate NPV and IRR for a quote by creating a modified business case
   */
  private static calculateQuoteMetrics(quote: CustomerQuote, businessCase: BusinessCase): { npv: number; irr: number | null } {
    try {
      // Create a modified business case with the quote's pricing
      const modifiedBusinessCase = this.createModifiedBusinessCase(quote, businessCase);

      // Calculate the scenario with the modified pricing
      const calc = calculateScenario(modifiedBusinessCase);

      return {
        npv: calc.returns.npv,
        irr: calc.returns.irr,
      };
    } catch (error) {
      console.error('Error calculating quote metrics:', error);

      // Fallback to approximate calculation if full calculation fails
      const baseCalc = calculateScenario(businessCase);
      const baseNpv = baseCalc.returns.npv;
      const baseIrr = baseCalc.returns.irr;

      // Simple price-based adjustment
      const originalQuote = this.generateQuote({
        businessCase,
      });

      const originalPrice = originalQuote.aggregatedTotals.totalExclGst.rsPerKg;
      const newPrice = quote.aggregatedTotals.totalExclGst.rsPerKg;
      const priceFactor = newPrice / Math.max(0.01, originalPrice);

      return {
        npv: baseNpv * priceFactor,
        irr: baseIrr ? baseIrr * Math.sqrt(priceFactor) : null,
      };
    }
  }

  /**
 * Create a modified business case with the quote's pricing
 */
  private static createModifiedBusinessCase(quote: CustomerQuote, businessCase: BusinessCase): BusinessCase {
    const modifiedBusinessCase = JSON.parse(JSON.stringify(businessCase)) as BusinessCase;

    // Update each SKU in the business case with its corresponding quote pricing
    quote.skuItems.forEach(quoteItem => {
      if (!quoteItem.included) return; // Skip non-included SKUs

      const skuToModify = modifiedBusinessCase.skus.find(s => s.id === quoteItem.skuId);
      if (!skuToModify) {
        console.warn(`SKU ${quoteItem.skuId} not found in business case`);
        return;
      }

      // Update the SKU's costing parameters to match the quote
      // Note: This is a simplified mapping - in practice, you might need more sophisticated conversion

      // Update resin pricing
      skuToModify.costing.resinRsPerKg = quoteItem.components.resin.rsPerKg;

      // Update masterbatch pricing
      skuToModify.costing.mbRsPerKg = quoteItem.components.mb.rsPerKg;

      // Update packaging
      skuToModify.costing.packagingRsPerKg = quoteItem.components.packaging.rsPerKg;

      // Update freight
      skuToModify.costing.freightOutRsPerKg = quoteItem.components.freight.rsPerKg;

      // Update value add (convert from per-kg to per-piece)
      skuToModify.costing.valueAddRsPerPiece = quoteItem.components.conversionCharge.rsPerPiece;

      // Update conversion recovery (if applicable)
      skuToModify.sales.conversionRecoveryRsPerPiece = quoteItem.components.conversionCharge.rsPerPiece;
    });

    return modifiedBusinessCase;
  }

  // ============================================================================
  // QUOTE UTILITIES
  // ============================================================================

  /**
 * Update quote totals after component changes
 */
  static updateQuoteTotals(quote: CustomerQuote): CustomerQuote {
    const updatedQuote = { ...quote };

    // Recalculate aggregated totals
    updatedQuote.aggregatedTotals = this.calculateAggregatedTotals(quote.skuItems, quote.gstRate);
    updatedQuote.updatedAt = new Date().toISOString();

    return updatedQuote;
  }

  /**
   * Validate quote data
   */
  static validateQuote(quote: CustomerQuote): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for negative values in each SKU item
    quote.skuItems.forEach((skuItem, index) => {
      Object.entries(skuItem.components).forEach(([component, values]) => {
        if (values.rsPerPiece < 0) {
          errors.push(`SKU ${skuItem.skuName}: ${component} per piece cannot be negative`);
        }
        if (values.rsPerKg < 0) {
          errors.push(`SKU ${skuItem.skuName}: ${component} per kg cannot be negative`);
        }
      });

      // Check quantity
      if (skuItem.quantity <= 0) {
        errors.push(`SKU ${skuItem.skuName}: quantity must be greater than 0`);
      }

      // Check consistency between per-piece and per-kg values
      if (skuItem.components.resin.rsPerKg > 0) {
        const productWeightKg = skuItem.components.resin.rsPerPiece / skuItem.components.resin.rsPerKg;
        if (productWeightKg <= 0 || !Number.isFinite(productWeightKg)) {
          errors.push(`SKU ${skuItem.skuName}: Invalid product weight calculation`);
        }
      }
    });

    // Check GST rate
    if (quote.gstRate < 0 || quote.gstRate > 1) {
      errors.push("GST rate must be between 0 and 1");
    }

    // Check that at least one SKU is included
    const includedSkus = quote.skuItems.filter(item => item.included);
    if (includedSkus.length === 0) {
      errors.push("At least one SKU must be included in the quote");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
