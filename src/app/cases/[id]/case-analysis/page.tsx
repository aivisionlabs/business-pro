"use client";

import RiskSensitivity from "@/components/RiskSensitivity";
import ScenarioAnalysis from "@/components/ScenarioAnalysis";
import { useBusinessCase } from "@/lib/hooks/useFirestore";
import {
  Box,
  Card,
  CardContent,
  Container,
  Paper,
  Typography,
  Chip,
  Button,
  Breadcrumbs,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { ArrowBack } from "@mui/icons-material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import Link from "next/link";

export default function CaseAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const { businessCase: scenario, loading, error } = useBusinessCase(caseId);

  const handleBack = () => {
    router.push(`/cases/${caseId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Card variant="outlined" sx={{ maxWidth: 600, mx: "auto" }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 600, mb: 2, color: "primary.main" }}
              >
                🔬 Loading Case Analysis
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Preparing advanced risk assessment and scenario modeling
                tools...
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              borderRadius: 4,
              p: 6,
              color: "white",
              maxWidth: 600,
              mx: "auto",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
              ❌ Error Loading Case
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {error}
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!scenario) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              borderRadius: 4,
              p: 6,
              color: "white",
              maxWidth: 600,
              mx: "auto",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
              🔍 Case Not Found
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              The requested business case could not be located.
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Navigation Header */}
      <Box sx={{ py: 3 }}>
        {/* Back Button and Breadcrumbs */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{
              borderColor: "#3b82f6",
              color: "#1e40af",
              "&:hover": {
                borderColor: "#2563eb",
                backgroundColor: "#eff6ff",
              },
            }}
          >
            Back to Case
          </Button>

          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ ml: 2 }}
          >
            <Link
              href="/cases"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Cases
            </Link>
            <Link
              href={`/cases/${caseId}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {scenario.name}
            </Link>
            <Typography color="text.primary">Risk Analysis</Typography>
          </Breadcrumbs>
        </Box>
      </Box>

      {/* Case Context Header */}
      <Box sx={{ py: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            border: "2px solid #e0e7ff",
            background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "#1e293b",
              mb: 2,
              textAlign: "center",
            }}
          >
            📋 {scenario.name}
          </Typography>

          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "#475569", mb: 1 }}
            >
              {scenario.skus.length}{" "}
              {scenario.skus.length === 1 ? "SKU" : "SKUs"}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                justifyContent: "center",
              }}
            >
              {scenario.skus.map((sku) => (
                <Chip
                  key={sku.id}
                  label={sku.name}
                  variant="outlined"
                  sx={{
                    borderColor: "#3b82f6",
                    color: "#1e40af",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                  }}
                />
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Premium Header */}
      <Box sx={{ py: 6 }}>
        {/* Main Analysis Content */}
        <Box sx={{ spaceY: 6 }}>
          {/* Risk Sensitivity Analysis */}
          <Paper
            elevation={0}
            sx={{ p: 4, mb: 6, borderRadius: 3, border: "2px solid #f0f0f0" }}
          >
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ mb: 4, fontWeight: 800, color: "#1e293b" }}
            >
              🎯 Risk Sensitivity Analysis
            </Typography>
            <RiskSensitivity scenario={scenario} />
          </Paper>

          {/* Scenario Analysis */}
          <Paper
            elevation={0}
            sx={{ p: 4, mb: 6, borderRadius: 3, border: "2px solid #f0f0f0" }}
          >
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ mb: 4, fontWeight: 800, color: "#1e293b" }}
            >
              📊 Scenario Analysis
            </Typography>
            <ScenarioAnalysis scenario={scenario} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}
