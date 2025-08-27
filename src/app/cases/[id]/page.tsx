"use client";

import MultiSkuEditor from "@/components/MultiSkuEditor";
import CaseProgressBar from "@/components/CaseProgressBar";
import { useBusinessCase, usePlantMaster } from "@/lib/hooks/useFirestore";
import Link from "next/link";
import { use } from "react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

export default function CaseDetail({
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

  // Note: charts are rendered inside MultiSkuEditor just above the debug panel
  return (
    <main>
      <Container maxWidth="xl" sx={{ py: 4, pt: 4 }}>
        <MultiSkuEditor scenario={scenario} plantOptions={plants} />
      </Container>
    </main>
  );
}
