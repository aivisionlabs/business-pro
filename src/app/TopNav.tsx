import AppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import Image from "next/image";

export default function TopNav() {
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
          <Link
            href="/cases"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
              <Image
                src="/logo/MTL-logo.png"
                alt="Manjushree Advanced Packaging Solutions"
                width={200}
                height={80}
                style={{ objectFit: "contain" }}
              />
            </Box>
            <Typography
              variant="h6"
              color="text.primary"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.125rem", sm: "1.25rem" },
                cursor: "pointer",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "none",
                },
              }}
            >
              BusinessCase Pro
            </Typography>
          </Link>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
