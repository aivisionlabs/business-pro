"use client";

import RiskScenarios from "@/components/RiskScenarios";
import RiskSensitivity from "@/components/RiskSensitivity";
import { useBusinessCase } from "@/lib/hooks/useFirestore";
import { Analytics, Business, Home } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Container,
  Link as MuiLink,
  Paper,
  Typography,
} from "@mui/material";
import { useParams } from "next/navigation";

export default function CaseAnalysisPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { businessCase: scenario, loading, error } = useBusinessCase(caseId);

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4">Loading case analysis...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" color="error">
            Error loading case: {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!scenario) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" color="error">
            Case not found
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <MuiLink
            href="/"
            color="inherit"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Home sx={{ mr: 0.5, fontSize: 20 }} />
            Home
          </MuiLink>
          <MuiLink
            href="/cases"
            color="inherit"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Business sx={{ mr: 0.5, fontSize: 20 }} />
            Cases
          </MuiLink>
          <MuiLink
            href={`/cases/${caseId}`}
            color="inherit"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Business sx={{ mr: 0.5, fontSize: 20 }} />
            {scenario.name || `Case ${caseId}`}
          </MuiLink>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Analytics sx={{ mr: 0.5, fontSize: 20 }} />
            Case Analysis
          </Box>
        </Breadcrumbs>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Case Analysis
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {scenario.name || `Case ${caseId}`}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive risk analysis and scenario modeling for business case
            evaluation
          </Typography>
        </Box>

        {/* Risk Analysis Content */}
        <Box sx={{ spaceY: 6 }}>
          {/* Risk Sensitivity Analysis */}
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Risk Sensitivity Analysis
            </Typography>
            <RiskSensitivity scenario={scenario} />
          </Paper>

          {/* Risk Scenarios */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
              Risk Scenarios
            </Typography>
            <RiskScenarios scenario={scenario} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}
