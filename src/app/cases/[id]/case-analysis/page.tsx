"use client";

import RiskScenarios from "@/components/RiskScenarios";
import RiskSensitivity from "@/components/RiskSensitivity";
import ScenarioModeling from "@/components/ScenarioModeling";
import { useBusinessCase } from "@/lib/hooks/useFirestore";
import {
  Analytics,
  Assessment,
  Business,
  Home,
  Timeline,
} from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Card,
  CardContent,
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
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: 4,
              p: 6,
              color: "white",
              maxWidth: 600,
              mx: "auto",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
              🔬 Loading Case Analysis
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Preparing advanced risk assessment and scenario modeling tools...
            </Typography>
          </Box>
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

          {/* Risk Scenarios */}
          <Paper
            elevation={0}
            sx={{ p: 4, borderRadius: 3, border: "2px solid #f0f0f0" }}
          >
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ mb: 4, fontWeight: 800, color: "#1e293b" }}
            >
              🌟 Risk Scenarios & Mitigation
            </Typography>
            <RiskScenarios scenario={scenario} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}
