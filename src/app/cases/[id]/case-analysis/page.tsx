"use client";

import RiskScenarios from "@/components/RiskScenarios";
import RiskSensitivity from "@/components/RiskSensitivity";
import ScenarioModeling from "@/components/ScenarioModeling";
import { useBusinessCase } from "@/lib/hooks/useFirestore";
import {
  Analytics,
  Business,
  Home,
  Timeline,
  Assessment,
} from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Container,
  Link as MuiLink,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
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
        <Box
          sx={{
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            borderRadius: 4,
            p: 5,
            color: "white",
            position: "relative",
            overflow: "hidden",
            mb: 4,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background: "rgba(255,255,255,0.05)",
              borderRadius: "50%",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -50,
              left: -50,
              width: 200,
              height: 200,
              background: "rgba(255,255,255,0.03)",
              borderRadius: "50%",
            }}
          />

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Typography variant="h2" sx={{ fontWeight: 900, mb: 2 }}>
              🎯 Advanced Case Analysis
            </Typography>
            <Typography
              variant="h5"
              sx={{ opacity: 0.9, maxWidth: 800, mb: 3 }}
            >
              Comprehensive risk assessment, sensitivity analysis, and scenario
              modeling for
              <strong> {scenario.name || "Business Case"}</strong>
            </Typography>

            {/* Breadcrumbs */}
            <Breadcrumbs
              sx={{
                color: "rgba(255,255,255,0.8)",
                "& .MuiBreadcrumbs-separator": {
                  color: "rgba(255,255,255,0.5)",
                },
              }}
            >
              <MuiLink href="/cases" color="inherit" underline="hover">
                <Home sx={{ mr: 0.5, verticalAlign: "middle" }} />
                Cases
              </MuiLink>
              <MuiLink
                href={`/cases/${caseId}`}
                color="inherit"
                underline="hover"
              >
                <Business sx={{ mr: 0.5, verticalAlign: "middle" }} />
                {scenario.name || "Case"}
              </MuiLink>
              <Typography color="inherit">
                <Analytics sx={{ mr: 0.5, verticalAlign: "middle" }} />
                Analysis
              </Typography>
            </Breadcrumbs>
          </Box>
        </Box>

        {/* Feature Overview Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
            mb: 6,
          }}
        >
          <Card
            elevation={0}
            sx={{
              border: "2px solid #f0f0f0",
              borderRadius: 3,
              background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
              height: "100%",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: "center" }}>
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "50%",
                  width: 80,
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <Timeline sx={{ fontSize: 40, color: "white" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#2c3e50", mb: 1 }}
              >
                Scenario Modeling
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                Explore multiple business scenarios with AI-powered financial
                modeling
              </Typography>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              border: "2px solid #f0f0f0",
              borderRadius: 3,
              background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
              height: "100%",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: "center" }}>
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  borderRadius: "50%",
                  width: 80,
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <Assessment sx={{ fontSize: 40, color: "white" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#2c3e50", mb: 1 }}
              >
                Risk Assessment
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                Comprehensive risk analysis with sensitivity testing and
                mitigation strategies
              </Typography>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              border: "2px solid #f0f0f0",
              borderRadius: 3,
              background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
              height: "100%",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: "center" }}>
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  borderRadius: "50%",
                  width: 80,
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <Analytics sx={{ fontSize: 40, color: "white" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#2c3e50", mb: 1 }}
              >
                Sensitivity Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                Identify key variables and their impact on business outcomes
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Main Analysis Content */}
        <Box sx={{ spaceY: 6 }}>
          {/* Advanced Scenario Modeling */}
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
              🚀 Advanced Scenario Modeling
            </Typography>
            <ScenarioModeling businessCase={scenario} />
          </Paper>

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
