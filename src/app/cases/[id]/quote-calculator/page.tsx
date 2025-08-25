"use client";

import QuoteCalculator from "@/components/QuoteCalculator";
import { useBusinessCase, usePlantMaster } from "@/lib/hooks/useFirestore";
import Link from "next/link";
import { use } from "react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export default function QuoteCalculatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { businessCase: scenario, loading, error } = useBusinessCase(id);
  const { plants, loading: plantsLoading } = usePlantMaster();

  if (loading || plantsLoading) {
    return (
      <main>
        <Container maxWidth="xl">
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight="60vh"
            flexDirection="column"
            gap={2}
            pt={4}
          >
            <CircularProgress color="primary" />
            <Box component="p" sx={{ color: "text.secondary", m: 0 }}>
              Loading case...
            </Box>
          </Box>
        </Container>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <Container maxWidth="xl">
          <Box py={6} pt={4}>
            <Alert severity="error" sx={{ mb: 2 }}>
              Error: {error}
            </Alert>
            <Button LinkComponent={Link} href="/cases" variant="outlined">
              Back to cases
            </Button>
          </Box>
        </Container>
      </main>
    );
  }

  if (!scenario) {
    return (
      <main>
        <Container maxWidth="xl">
          <Box py={6} pt={4} textAlign="center">
            <Box component="div" sx={{ fontSize: 22, fontWeight: 700, mb: 1 }}>
              Case not found
            </Box>
            <Button LinkComponent={Link} href="/cases" variant="outlined">
              Back to cases
            </Button>
          </Box>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container maxWidth="xl" sx={{ py: 4, pt: 4 }}>
        {/* Breadcrumbs */}
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
          >
            <Link
              href="/cases"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Cases
            </Link>
            <Link
              href={`/cases/${id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {scenario.name}
            </Link>
            <Typography color="text.primary">Quote Calculator</Typography>
          </Breadcrumbs>
        </Box>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Quote Calculator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and manage customer quotations for {scenario.name}
          </Typography>
        </Box>

        {/* Quote Calculator Component */}
        <QuoteCalculator businessCase={scenario} />

        {/* Navigation Buttons */}
        <Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center" }}>
          <Button LinkComponent={Link} href={`/cases/${id}`} variant="outlined">
            Back to Case
          </Button>
          <Button
            LinkComponent={Link}
            href={`/cases/${id}/chat`}
            variant="contained"
          >
            Open Chat for this Case
          </Button>
        </Box>
      </Container>
    </main>
  );
}
