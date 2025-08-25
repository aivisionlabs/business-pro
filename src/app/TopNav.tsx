"use client";

import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={1}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          <Typography
            variant="h6"
            color="text.primary"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.125rem", sm: "1.25rem" },
              mr: 4,
            }}
          >
            BusinessCase Pro
          </Typography>

          <Box sx={{ display: "flex", gap: 1, flex: 1 }}>
            <Button
              component={Link}
              href="/cases"
              variant={isActive("/cases") ? "contained" : "text"}
              color={isActive("/cases") ? "primary" : "inherit"}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                minWidth: "auto",
                px: 2,
              }}
            >
              Cases
            </Button>
            <Button
              component={Link}
              href="/chat"
              variant={isActive("/chat") ? "contained" : "text"}
              color={isActive("/chat") ? "primary" : "inherit"}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                minWidth: "auto",
                px: 2,
              }}
            >
              Chat
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
