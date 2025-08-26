"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Calculate as CalculateIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import {
  BusinessCase,
  CustomerQuote,
  QuoteOptimizationResult,
} from "@/lib/types";

interface QuoteCalculatorProps {
  businessCase: BusinessCase;
  onQuoteGenerated?: (quote: CustomerQuote) => void;
}

export default function QuoteCalculator({
  businessCase,
  onQuoteGenerated,
}: QuoteCalculatorProps) {
  const [quote, setQuote] = useState<CustomerQuote | null>(null);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<{
    rsPerPiece: number;
    rsPerKg: number;
  }>({
    rsPerPiece: 0,
    rsPerKg: 0,
  });
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationDialog, setOptimizationDialog] = useState(false);
  const [optimizationParams, setOptimizationParams] = useState({
    mode: "conversion_only" as "conversion_only" | "all_components",
    targetNpv: "",
    targetIrr: "",
  });
  const [optimizationResult, setOptimizationResult] =
    useState<QuoteOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailParams, setEmailParams] = useState({
    email: "",
    name: "",
    company: "",
    message: "",
    includePdf: true,
    includeExcel: false,
  });
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("QuoteCalculator - Debug Info:", {
      businessCaseSkus: businessCase.skus.map((s) => ({
        id: s.id,
        name: s.name,
      })),
      totalSkus: businessCase.skus.length,
    });
  }, [businessCase.skus]);

  // Generate initial quote
  const generateQuote = useCallback(async () => {
    if (businessCase.skus.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCase,
          quoteName: `Quote for ${businessCase.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quote");
      }

      const { quote: newQuote } = await response.json();
      setQuote(newQuote);
      onQuoteGenerated?.(newQuote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quote");
    } finally {
      setLoading(false);
    }
  }, [businessCase, onQuoteGenerated]);

  // Update quote totals after component changes
  const updateQuoteTotals = useCallback(async (updatedQuote: CustomerQuote) => {
    try {
      const response = await fetch("/api/quotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote: updatedQuote }),
      });

      if (!response.ok) {
        throw new Error("Failed to update quote");
      }

      const { quote: refreshedQuote } = await response.json();
      setQuote(refreshedQuote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quote");
    }
  }, []);

  // Handle component editing
  const handleEditComponent = (componentName: string, component: any) => {
    setEditingComponent(componentName);
    setTempValues({
      rsPerPiece: component.rsPerPiece,
      rsPerKg: component.rsPerKg,
    });
  };

  const handleSaveComponent = async () => {
    if (!quote || !editingComponent) return;

    // Parse editing component key (format: "skuId-componentKey")
    const [skuId, componentKey] = editingComponent.split("-");

    const updatedQuote = {
      ...quote,
      skuItems: quote.skuItems.map((skuItem) =>
        skuItem.skuId === skuId
          ? {
              ...skuItem,
              components: {
                ...skuItem.components,
                [componentKey]: tempValues,
              },
            }
          : skuItem
      ),
    };

    await updateQuoteTotals(updatedQuote);
    setEditingComponent(null);
  };

  const handleCancelEdit = () => {
    setEditingComponent(null);
    setTempValues({ rsPerPiece: 0, rsPerKg: 0 });
  };

  // Handle optimization
  const handleOptimize = async () => {
    if (!quote) return;

    setOptimizing(true);
    setError(null);

    try {
      const targetNpv = optimizationParams.targetNpv
        ? parseFloat(optimizationParams.targetNpv)
        : undefined;
      const targetIrr = optimizationParams.targetIrr
        ? parseFloat(optimizationParams.targetIrr) / 100
        : undefined;

      const response = await fetch("/api/quotes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          businessCase,
          targetNpv,
          targetIrr,
          optimizationMode: optimizationParams.mode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to optimize quote");
      }

      const { result } = await response.json();
      setOptimizationResult(result);
      setQuote(result.optimizedQuote);
      setOptimizationDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to optimize quote");
    } finally {
      setOptimizing(false);
    }
  };

  // Handle export
  const handleExport = async (format: "pdf" | "excel") => {
    if (!quote) return;

    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          format,
          includeDetails: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to export quote");
      }

      // Handle different export formats
      if (format === "pdf") {
        // For PDF, we get HTML content that can be printed to PDF
        const htmlContent = await response.text();

        // Create a new window with the HTML content for printing
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();

          // Wait for content to load then trigger print
          printWindow.onload = () => {
            // Show a message to the user
            if (
              printWindow.confirm(
                "The quote has opened in a new window. Click OK to print, or Cancel to save as HTML file."
              )
            ) {
              printWindow.print();
              // Close the window after printing
              setTimeout(() => printWindow.close(), 1000);
            } else {
              // User chose to save as HTML file
              const blob = new Blob([htmlContent], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `quote-${quote.quoteName || "export"}.html`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              printWindow.close();
            }
          };
        } else {
          // Fallback: download as HTML file
          const blob = new Blob([htmlContent], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `quote-${quote.quoteName || "export"}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        // For Excel/CSV, get the blob and download
        const contentDisposition = response.headers.get("content-disposition");
        let filename = "quote-export.csv";

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          );
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, "");
          }
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export quote");
    } finally {
      setExporting(false);
    }
  };

  // Handle email
  const handleEmail = async () => {
    if (!quote) return;

    setEmailing(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          recipient: {
            email: emailParams.email,
            name: emailParams.name || undefined,
            company: emailParams.company || undefined,
          },
          message: emailParams.message || undefined,
          attachments: {
            includePdf: emailParams.includePdf,
            includeExcel: emailParams.includeExcel,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send quote email");
      }

      const result = await response.json();

      // Reset form and close dialog
      setEmailParams({
        email: "",
        name: "",
        company: "",
        message: "",
        includePdf: true,
        includeExcel: false,
      });
      setEmailDialog(false);

      // Show success message (you could use a snackbar here)
      alert(`Quote emailed successfully to ${result.sentTo}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send quote email"
      );
    } finally {
      setEmailing(false);
    }
  };

  // Generate quote on mount
  useEffect(() => {
    if (!quote && businessCase.skus.length > 0) {
      generateQuote();
    }
  }, [quote, businessCase.skus.length, generateQuote]);

  // Better error handling with more information
  if (!businessCase.skus || businessCase.skus.length === 0) {
    return (
      <Alert severity="warning">
        No SKUs found in business case. Please add at least one SKU to generate
        quotes.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Generating quote...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={generateQuote}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!quote) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Smart Quote Calculator
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Generate a customer quotation for all SKUs in {businessCase.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Available SKUs: {businessCase.skus.map((s) => s.name).join(", ")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<CalculateIcon />}
            onClick={generateQuote}
          >
            Generate Quote
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Component keys for consistent display
  const componentKeys = [
    { key: "resin", label: "Resin" },
    { key: "mb", label: "MB" },
    { key: "wastage", label: "Wastage" },
    { key: "packaging", label: "Packaging" },
    { key: "freight", label: "Freight" },
    { key: "mouldAmortisation", label: "Mould Amortisation" },
    { key: "conversionCharge", label: "Conversion Charge" },
    { key: "discount", label: "Discount" },
  ];

  return (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Smart Quote Calculator</Typography>
          <Box>
            <Tooltip title="Optimize Quote">
              <IconButton
                color="primary"
                onClick={() => setOptimizationDialog(true)}
                disabled={optimizing}
              >
                <CalculateIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download PDF">
              <IconButton
                color="primary"
                onClick={() => handleExport("pdf")}
                disabled={exporting}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Email Quote">
              <IconButton
                color="primary"
                onClick={() => setEmailDialog(true)}
                disabled={emailing}
              >
                <EmailIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {quote.quoteName} • SKUs:{" "}
          {quote.skuItems.filter((item) => item.included).length} included
        </Typography>

        {optimizationResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Optimization{" "}
              {optimizationResult.convergenceInfo.converged
                ? "successful"
                : "partially successful"}
              : NPV ₹{optimizationResult.achievedNpv.toLocaleString()}, IRR{" "}
              {optimizationResult.achievedIrr
                ? (optimizationResult.achievedIrr * 100).toFixed(2) + "%"
                : "N/A"}
              ({optimizationResult.convergenceInfo.iterations} iterations)
            </Typography>
          </Alert>
        )}

        {/* SKU Items Display */}
        {quote.skuItems.map((skuItem, index) => (
          <Box key={skuItem.skuId} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {skuItem.skuName}{" "}
              {!skuItem.included && (
                <Chip size="small" label="Excluded" color="secondary" />
              )}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Rs/pc</TableCell>
                    <TableCell align="right">Rs/kg</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {componentKeys.map(({ key, label }) => {
                    const component =
                      skuItem.components[
                        key as keyof typeof skuItem.components
                      ];
                    const editKey = `${skuItem.skuId}-${key}`;

                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {label}
                            {!quote.editableComponents[
                              key as keyof typeof quote.editableComponents
                            ] && (
                              <Chip
                                size="small"
                                label="Fixed"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {editingComponent === editKey ? (
                            <TextField
                              size="small"
                              type="number"
                              value={tempValues.rsPerPiece}
                              onChange={(e) =>
                                setTempValues((prev) => ({
                                  ...prev,
                                  rsPerPiece: parseFloat(e.target.value) || 0,
                                }))
                              }
                              inputProps={{ step: 0.01 }}
                            />
                          ) : (
                            `₹${component.rsPerPiece.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {editingComponent === editKey ? (
                            <TextField
                              size="small"
                              type="number"
                              value={tempValues.rsPerKg}
                              onChange={(e) =>
                                setTempValues((prev) => ({
                                  ...prev,
                                  rsPerKg: parseFloat(e.target.value) || 0,
                                }))
                              }
                              inputProps={{ step: 0.01 }}
                            />
                          ) : (
                            `₹${component.rsPerKg.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {index === 0 && key === "resin"
                            ? skuItem.quantity
                            : ""}
                        </TableCell>
                        <TableCell align="center">
                          {editingComponent === editKey ? (
                            <Box>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={handleSaveComponent}
                              >
                                <SaveIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={handleCancelEdit}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            quote.editableComponents[
                              key as keyof typeof quote.editableComponents
                            ] && (
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleEditComponent(editKey, component)
                                }
                              >
                                <EditIcon />
                              </IconButton>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* SKU Totals */}
                  <TableRow>
                    <TableCell>
                      <strong>SKU Total (excl. GST)</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>
                        ₹{skuItem.totalExclGst.rsPerPiece.toFixed(2)}
                      </strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>
                        ₹{skuItem.totalExclGst.rsPerKg.toFixed(2)}
                      </strong>
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}

        {/* Aggregated Totals */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: "grey.50", borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Quote Summary
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>
                    <strong>Total (excl. GST)</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      ₹
                      {quote.aggregatedTotals.totalExclGst.rsPerPiece.toFixed(
                        2
                      )}
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      ₹{quote.aggregatedTotals.totalExclGst.rsPerKg.toFixed(2)}
                    </strong>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    GST ({(quote.gstRate * 100).toFixed(0)}%)
                  </TableCell>
                  <TableCell align="right">
                    ₹{quote.aggregatedTotals.gst.rsPerPiece.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    ₹{quote.aggregatedTotals.gst.rsPerKg.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow
                  sx={{
                    backgroundColor: "primary.light",
                    color: "primary.contrastText",
                  }}
                >
                  <TableCell>
                    <strong>Total (incl. GST)</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      ₹
                      {quote.aggregatedTotals.totalInclGst.rsPerPiece.toFixed(
                        2
                      )}
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      ₹{quote.aggregatedTotals.totalInclGst.rsPerKg.toFixed(2)}
                    </strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>

      {/* Optimization Dialog */}
      <Dialog
        open={optimizationDialog}
        onClose={() => setOptimizationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Optimize Quote</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Optimization Mode</InputLabel>
                <Select
                  value={optimizationParams.mode}
                  onChange={(e) =>
                    setOptimizationParams((prev) => ({
                      ...prev,
                      mode: e.target.value as
                        | "conversion_only"
                        | "all_components",
                    }))
                  }
                  label="Optimization Mode"
                >
                  <MenuItem value="conversion_only">
                    Conversion Charge Only
                  </MenuItem>
                  <MenuItem value="all_components">All Components</MenuItem>
                </Select>
              </FormControl>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                {optimizationParams.mode === "conversion_only"
                  ? "Only the conversion charge will be adjusted to meet target"
                  : "All components except conversion charge will be adjusted"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Target NPV (₹)"
                type="number"
                fullWidth
                value={optimizationParams.targetNpv}
                onChange={(e) =>
                  setOptimizationParams((prev) => ({
                    ...prev,
                    targetNpv: e.target.value,
                  }))
                }
                inputProps={{ step: 10000 }}
              />
              <TextField
                label="Target IRR (%)"
                type="number"
                fullWidth
                value={optimizationParams.targetIrr}
                onChange={(e) =>
                  setOptimizationParams((prev) => ({
                    ...prev,
                    targetIrr: e.target.value,
                  }))
                }
                inputProps={{ step: 0.1, min: 0, max: 100 }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Provide either target NPV or target IRR (or both)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptimizationDialog(false)}>Cancel</Button>
          <Button
            onClick={handleOptimize}
            variant="contained"
            disabled={
              optimizing ||
              (!optimizationParams.targetNpv && !optimizationParams.targetIrr)
            }
            startIcon={
              optimizing ? <CircularProgress size={16} /> : <CalculateIcon />
            }
          >
            {optimizing ? "Optimizing..." : "Optimize"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <Dialog
        open={emailDialog}
        onClose={() => setEmailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Email Quote</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Recipient Email *"
              type="email"
              fullWidth
              required
              value={emailParams.email}
              onChange={(e) =>
                setEmailParams((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
            <TextField
              label="Recipient Name"
              fullWidth
              value={emailParams.name}
              onChange={(e) =>
                setEmailParams((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
            <TextField
              label="Company"
              fullWidth
              value={emailParams.company}
              onChange={(e) =>
                setEmailParams((prev) => ({
                  ...prev,
                  company: e.target.value,
                }))
              }
            />
            <TextField
              label="Custom Message"
              multiline
              rows={4}
              fullWidth
              placeholder="Add a personal message to the email..."
              value={emailParams.message}
              onChange={(e) =>
                setEmailParams((prev) => ({
                  ...prev,
                  message: e.target.value,
                }))
              }
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Attachments
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id="includePdf"
                    checked={emailParams.includePdf}
                    onChange={(e) =>
                      setEmailParams((prev) => ({
                        ...prev,
                        includePdf: e.target.checked,
                      }))
                    }
                  />
                  <label htmlFor="includePdf" style={{ marginLeft: 8 }}>
                    Include PDF
                  </label>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id="includeExcel"
                    checked={emailParams.includeExcel}
                    onChange={(e) =>
                      setEmailParams((prev) => ({
                        ...prev,
                        includeExcel: e.target.checked,
                      }))
                    }
                  />
                  <label htmlFor="includeExcel" style={{ marginLeft: 8 }}>
                    Include Excel
                  </label>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialog(false)}>Cancel</Button>
          <Button
            onClick={handleEmail}
            variant="contained"
            disabled={emailing || !emailParams.email}
            startIcon={
              emailing ? <CircularProgress size={16} /> : <EmailIcon />
            }
          >
            {emailing ? "Sending..." : "Send Email"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
