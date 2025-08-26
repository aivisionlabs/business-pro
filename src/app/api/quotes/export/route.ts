import { NextRequest, NextResponse } from "next/server";
import { CustomerQuote } from "@/lib/types";

/**
 * POST /api/quotes/export - Export quote to PDF or Excel
 */
export async function POST(request: NextRequest) {
  try {
    const body: {
      quote: CustomerQuote;
      format: 'pdf' | 'excel';
      includeDetails?: boolean;
    } = await request.json();

    // Validate required fields
    if (!body.quote || !body.format) {
      return NextResponse.json(
        { error: "quote and format are required" },
        { status: 400 }
      );
    }

    if (!['pdf', 'excel'].includes(body.format)) {
      return NextResponse.json(
        { error: "format must be 'pdf' or 'excel'" },
        { status: 400 }
      );
    }

    const { quote, format, includeDetails = true } = body;

    if (format === 'pdf') {
      return await exportToPDF(quote, includeDetails);
    } else {
      return await exportToExcel(quote, includeDetails);
    }
  } catch (error) {
    console.error("Error exporting quote:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export quote" },
      { status: 500 }
    );
  }
}

/**
 * Export quote to PDF format
 */
async function exportToPDF(quote: CustomerQuote, includeDetails: boolean) {
  try {
    // Generate HTML content
    const htmlContent = generateQuoteHTML(quote, includeDetails);

    // Convert HTML to PDF using jsPDF with html2canvas
    // For now, we'll return the HTML with proper headers for browser PDF generation
    // In production, you might want to use a server-side PDF generation library

    const response = new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="quote_${quote.quoteName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
}

/**
 * Export quote to Excel format
 */
async function exportToExcel(quote: CustomerQuote, includeDetails: boolean) {
  try {
    const csvContent = generateQuoteCSV(quote, includeDetails);

    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="quote_${quote.quoteName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating Excel:", error);
    throw new Error("Failed to generate Excel file");
  }
}

/**
 * Generate HTML content for the quote
 */
function generateQuoteHTML(quote: CustomerQuote, includeDetails: boolean): string {
  // Generate SKU tables HTML
  const skuTablesHtml = quote.skuItems
    .filter(item => item.included)
    .map(skuItem => `
      <h3>${skuItem.skuName} (Quantity: ${skuItem.quantity})</h3>
      <table class="quote-table">
        <thead>
          <tr>
            <th>Component</th>
            <th class="right-align">Rs/pc</th>
            <th class="right-align">Rs/kg</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Resin</td><td class="right-align">₹${skuItem.components.resin.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${skuItem.components.resin.rsPerKg.toFixed(2)}</td></tr>
          <tr><td>MB</td><td class="right-align">₹${skuItem.components.mb.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${skuItem.components.mb.rsPerKg.toFixed(2)}</td></tr>
          <tr><td>Wastage</td><td class="right-align">₹${skuItem.components.wastage.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${skuItem.components.wastage.rsPerKg.toFixed(2)}</td></tr>
          <tr><td>Packaging</td><td class="right-align">₹${skuItem.components.packaging.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${skuItem.components.packaging.rsPerKg.toFixed(2)}</td></tr>
          <tr><td>Freight</td><td class="right-align">₹${skuItem.components.freight.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${skuItem.components.freight.rsPerKg.toFixed(2)}</td></tr>
          <tr><td>Mould Amortisation</td><td class="right-align">₹${skuItem.components.mouldAmortisation.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${skuItem.components.mouldAmortisation.rsPerKg.toFixed(2)}</td></tr>
          <tr><td>Conversion Charge</td><td class="right-align">₹${skuItem.components.conversionCharge.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${skuItem.components.conversionCharge.rsPerKg.toFixed(2)}</td></tr>
          <tr><td>Discount</td><td class="right-align">-₹${skuItem.components.discount.rsPerPiece.toFixed(2)}</td><td class="right-align">-₹${skuItem.components.discount.rsPerKg.toFixed(2)}</td></tr>
          <tr class="totals"><td><strong>SKU Total (excl. GST)</strong></td><td class="right-align"><strong>₹${skuItem.totalExclGst.rsPerPiece.toFixed(2)}</strong></td><td class="right-align"><strong>₹${skuItem.totalExclGst.rsPerKg.toFixed(2)}</strong></td></tr>
        </tbody>
      </table>
    `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${quote.quoteName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .quote-info { margin-bottom: 20px; }
        .quote-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .quote-table th, .quote-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .quote-table th { background-color: #f2f2f2; }
        .totals { background-color: #f9f9f9; font-weight: bold; }
        .final-total { background-color: #e6f3ff; font-weight: bold; }
        .right-align { text-align: right; }
        .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 30px; }

        /* Print-specific styles */
        @media print {
            body { margin: 0; padding: 20px; }
            .header { page-break-after: avoid; }
            .quote-table { page-break-inside: avoid; }
            .summary { page-break-inside: avoid; }
            @page { margin: 1in; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Customer Quotation</h1>
        <h2>${quote.quoteName}</h2>
    </div>

    <div class="quote-info">
        <p><strong>Quote ID:</strong> ${quote.id}</p>
        <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</p>
        <p><strong>SKUs Included:</strong> ${quote.skuItems.filter(item => item.included).length}</p>
    </div>

    ${skuTablesHtml}

    <div class="summary">
        <h3>Quote Summary</h3>
        <table class="quote-table">
            <tbody>
                <tr class="totals"><td><strong>Total (excl. GST)</strong></td><td class="right-align"><strong>₹${quote.aggregatedTotals.totalExclGst.rsPerPiece.toFixed(2)}</strong></td><td class="right-align"><strong>₹${quote.aggregatedTotals.totalExclGst.rsPerKg.toFixed(2)}</strong></td></tr>
                <tr><td>GST (${(quote.gstRate * 100).toFixed(0)}%)</td><td class="right-align">₹${quote.aggregatedTotals.gst.rsPerPiece.toFixed(2)}</td><td class="right-align">₹${quote.aggregatedTotals.gst.rsPerKg.toFixed(2)}</td></tr>
                <tr class="final-total"><td><strong>Total (incl. GST)</strong></td><td class="right-align"><strong>₹${quote.aggregatedTotals.totalInclGst.rsPerPiece.toFixed(2)}</strong></td><td class="right-align"><strong>₹${quote.aggregatedTotals.totalInclGst.rsPerKg.toFixed(2)}</strong></td></tr>
            </tbody>
        </table>
    </div>

    ${includeDetails ? `
    <div class="quote-info">
        <h3>Quote Details</h3>
        <p><strong>Last Updated:</strong> ${new Date(quote.updatedAt).toLocaleDateString()}</p>
        <p><strong>Optimization Mode:</strong> ${quote.optimizationMode}</p>
        ${quote.targetNpv ? `<p><strong>Target NPV:</strong> ₹${quote.targetNpv.toLocaleString()}</p>` : ''}
        ${quote.targetIrr ? `<p><strong>Target IRR:</strong> ${(quote.targetIrr * 100).toFixed(2)}%</p>` : ''}
    </div>
    ` : ''}

    <div style="margin-top: 40px; text-align: center; color: #666;">
        <p>This quotation is valid for 30 days from the date of issue.</p>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Generate CSV content for the quote
 */
function generateQuoteCSV(quote: CustomerQuote, includeDetails: boolean): string {
  const lines = [
    // Header
    `Quote: ${quote.quoteName}`,
    `Date: ${new Date(quote.createdAt).toLocaleDateString()}`,
    `SKUs Included: ${quote.skuItems.filter(item => item.included).length}`,
    '',
  ];

  // Add each SKU's data
  quote.skuItems.filter(item => item.included).forEach(skuItem => {
    lines.push(
      `SKU: ${skuItem.skuName} (Quantity: ${skuItem.quantity})`,
      'Component,Rs/pc,Rs/kg',
      `Resin,${skuItem.components.resin.rsPerPiece.toFixed(2)},${skuItem.components.resin.rsPerKg.toFixed(2)}`,
      `MB,${skuItem.components.mb.rsPerPiece.toFixed(2)},${skuItem.components.mb.rsPerKg.toFixed(2)}`,
      `Wastage,${skuItem.components.wastage.rsPerPiece.toFixed(2)},${skuItem.components.wastage.rsPerKg.toFixed(2)}`,
      `Packaging,${skuItem.components.packaging.rsPerPiece.toFixed(2)},${skuItem.components.packaging.rsPerKg.toFixed(2)}`,
      `Freight,${skuItem.components.freight.rsPerPiece.toFixed(2)},${skuItem.components.freight.rsPerKg.toFixed(2)}`,
      `Mould Amortisation,${skuItem.components.mouldAmortisation.rsPerPiece.toFixed(2)},${skuItem.components.mouldAmortisation.rsPerKg.toFixed(2)}`,
      `Conversion Charge,${skuItem.components.conversionCharge.rsPerPiece.toFixed(2)},${skuItem.components.conversionCharge.rsPerKg.toFixed(2)}`,
      `Discount,-${skuItem.components.discount.rsPerPiece.toFixed(2)},-${skuItem.components.discount.rsPerKg.toFixed(2)}`,
      `SKU Total (excl. GST),${skuItem.totalExclGst.rsPerPiece.toFixed(2)},${skuItem.totalExclGst.rsPerKg.toFixed(2)}`,
      '',
    );
  });

  // Add aggregated totals
  lines.push(
    'Quote Summary',
    'Component,Rs/pc,Rs/kg',
    `Total (excl. GST),${quote.aggregatedTotals.totalExclGst.rsPerPiece.toFixed(2)},${quote.aggregatedTotals.totalExclGst.rsPerKg.toFixed(2)}`,
    `GST (${(quote.gstRate * 100).toFixed(0)}%),${quote.aggregatedTotals.gst.rsPerPiece.toFixed(2)},${quote.aggregatedTotals.gst.rsPerKg.toFixed(2)}`,
    `Total (incl. GST),${quote.aggregatedTotals.totalInclGst.rsPerPiece.toFixed(2)},${quote.aggregatedTotals.totalInclGst.rsPerKg.toFixed(2)}`,
  );

  if (includeDetails) {
    lines.push(
      '',
      'Quote Details',
      `Last Updated: ${new Date(quote.updatedAt).toLocaleDateString()}`,
      `Optimization Mode: ${quote.optimizationMode}`,
    );

    if (quote.targetNpv) {
      lines.push(`Target NPV: ${quote.targetNpv.toLocaleString()}`);
    }

    if (quote.targetIrr) {
      lines.push(`Target IRR: ${(quote.targetIrr * 100).toFixed(2)}%`);
    }
  }

  return lines.join('\n');
}
