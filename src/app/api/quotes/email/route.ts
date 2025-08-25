import { NextRequest, NextResponse } from "next/server";
import { CustomerQuote } from "@/lib/types";

/**
 * POST /api/quotes/email - Email quote to customer
 */
export async function POST(request: NextRequest) {
  try {
    const body: {
      quote: CustomerQuote;
      recipient: {
        email: string;
        name?: string;
        company?: string;
      };
      message?: string;
      attachments?: {
        includePdf?: boolean;
        includeExcel?: boolean;
      };
    } = await request.json();

    // Validate required fields
    if (!body.quote || !body.recipient?.email) {
      return NextResponse.json(
        { error: "quote and recipient email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.recipient.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const { quote, recipient, message = '', attachments = {} } = body;

    // In a real implementation, you would:
    // 1. Generate the quote attachments (PDF/Excel)
    // 2. Use an email service (SendGrid, AWS SES, Nodemailer, etc.)
    // 3. Send the email with attachments

    const emailContent = generateQuoteEmail(quote, recipient, message);

    // Simulate email sending (replace with actual email service)
    const emailResult = await simulateEmailSend(emailContent, recipient, attachments);

    return NextResponse.json({
      success: true,
      message: "Quote email sent successfully",
      emailId: emailResult.emailId,
      sentTo: recipient.email,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sending quote email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send quote email" },
      { status: 500 }
    );
  }
}

/**
 * Generate email content for the quote
 */
function generateQuoteEmail(
  quote: CustomerQuote,
  recipient: { email: string; name?: string; company?: string },
  customMessage: string
): string {
  const recipientName = recipient.name || 'Valued Customer';
  const companyText = recipient.company ? ` at ${recipient.company}` : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .quote-summary { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .quote-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .quote-table th, .quote-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .quote-table th { background-color: #f2f2f2; }
        .total-row { background-color: #d4edda; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Quotation: ${quote.quoteName}</h1>
            <p>Date: ${new Date(quote.createdAt).toLocaleDateString()}</p>
        </div>

        <div class="content">
            <p>Dear ${recipientName}${companyText},</p>

            ${customMessage ? `<p>${customMessage}</p>` : `
            <p>We are pleased to provide you with the following quotation as requested:</p>
            `}

            <div class="quote-summary">
                <h3>Quote Summary</h3>
                <p><strong>Quote ID:</strong> ${quote.id}</p>
                <p><strong>SKUs Included:</strong> ${quote.skuItems.filter(item => item.included).length}</p>
                <p><strong>Total (incl. GST):</strong> ₹${quote.aggregatedTotals.totalInclGst.rsPerPiece.toFixed(2)} per piece | ₹${quote.aggregatedTotals.totalInclGst.rsPerKg.toFixed(2)} per kg</p>
            </div>

            <h3>Detailed Breakdown</h3>
            ${quote.skuItems.filter(item => item.included).map(skuItem => `
                <h4>${skuItem.skuName} (Quantity: ${skuItem.quantity})</h4>
                <table class="quote-table">
                    <thead>
                        <tr>
                            <th>Component</th>
                            <th style="text-align: right;">Rs/piece</th>
                            <th style="text-align: right;">Rs/kg</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Resin</td><td style="text-align: right;">₹${skuItem.components.resin.rsPerPiece.toFixed(2)}</td><td style="text-align: right;">₹${skuItem.components.resin.rsPerKg.toFixed(2)}</td></tr>
                        <tr><td>Masterbatch</td><td style="text-align: right;">₹${skuItem.components.mb.rsPerPiece.toFixed(2)}</td><td style="text-align: right;">₹${skuItem.components.mb.rsPerKg.toFixed(2)}</td></tr>
                        <tr><td>Packaging</td><td style="text-align: right;">₹${skuItem.components.packaging.rsPerPiece.toFixed(2)}</td><td style="text-align: right;">₹${skuItem.components.packaging.rsPerKg.toFixed(2)}</td></tr>
                        <tr><td>Freight</td><td style="text-align: right;">₹${skuItem.components.freight.rsPerPiece.toFixed(2)}</td><td style="text-align: right;">₹${skuItem.components.freight.rsPerKg.toFixed(2)}</td></tr>
                        <tr><td>Conversion Charge</td><td style="text-align: right;">₹${skuItem.components.conversionCharge.rsPerPiece.toFixed(2)}</td><td style="text-align: right;">₹${skuItem.components.conversionCharge.rsPerKg.toFixed(2)}</td></tr>
                        <tr><td><strong>SKU Total (excl. GST)</strong></td><td style="text-align: right;"><strong>₹${skuItem.totalExclGst.rsPerPiece.toFixed(2)}</strong></td><td style="text-align: right;"><strong>₹${skuItem.totalExclGst.rsPerKg.toFixed(2)}</strong></td></tr>
                    </tbody>
                </table>
            `).join('')}

            <div style="margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px;">
                <h4>Quote Summary</h4>
                <table class="quote-table">
                    <tbody>
                        <tr><td><strong>Total (excl. GST)</strong></td><td style="text-align: right;"><strong>₹${quote.aggregatedTotals.totalExclGst.rsPerPiece.toFixed(2)}</strong></td><td style="text-align: right;"><strong>₹${quote.aggregatedTotals.totalExclGst.rsPerKg.toFixed(2)}</strong></td></tr>
                        <tr><td>GST (${(quote.gstRate * 100).toFixed(0)}%)</td><td style="text-align: right;">₹${quote.aggregatedTotals.gst.rsPerPiece.toFixed(2)}</td><td style="text-align: right;">₹${quote.aggregatedTotals.gst.rsPerKg.toFixed(2)}</td></tr>
                        <tr class="total-row"><td><strong>Total (incl. GST)</strong></td><td style="text-align: right;"><strong>₹${quote.aggregatedTotals.totalInclGst.rsPerPiece.toFixed(2)}</strong></td><td style="text-align: right;"><strong>₹${quote.aggregatedTotals.totalInclGst.rsPerKg.toFixed(2)}</strong></td></tr>
                    </tbody>
                </table>
            </div>

            <h3>Terms & Conditions</h3>
            <ul>
                <li>This quotation is valid for 30 days from the date of issue</li>
                <li>Prices are subject to final confirmation at the time of order</li>
                <li>GST as applicable will be charged extra</li>
                <li>Payment terms: As per agreed commercial terms</li>
                <li>Delivery: As per agreed schedule</li>
            </ul>

            <p>Should you have any questions or require any clarifications regarding this quotation, please feel free to contact us.</p>

            <p>We look forward to your favorable response and the opportunity to serve you.</p>

            <p>Best regards,<br>
            Sales Team<br>
            Your Company Name</p>
        </div>

        <div class="footer">
            <p><em>This is an automated email. Please do not reply to this email address.</em></p>
            <p>Quote generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Simulate email sending (replace with actual email service integration)
 */
async function simulateEmailSend(
  emailContent: string,
  recipient: { email: string; name?: string; company?: string },
  attachments: { includePdf?: boolean; includeExcel?: boolean }
): Promise<{ emailId: string; status: string }> {

  // In a real implementation, you would:
  // 1. Use an email service like SendGrid, AWS SES, or Nodemailer
  // 2. Generate and attach the quote files (PDF, Excel)
  // 3. Send the actual email
  // 4. Return the email service response

  // Example with a hypothetical email service:
  /*
  const emailService = new EmailService();
  const result = await emailService.send({
    to: recipient.email,
    subject: `Quotation: ${quote.quoteName}`,
    html: emailContent,
    attachments: [
      ...(attachments.includePdf ? [{ filename: 'quote.pdf', content: pdfBuffer }] : []),
      ...(attachments.includeExcel ? [{ filename: 'quote.xlsx', content: excelBuffer }] : []),
    ]
  });
  return result;
  */

  // Simulate delay and return success
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    emailId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'sent'
  };
}
