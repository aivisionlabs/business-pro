import AppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";

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
          <Link href="/cases">
            <Typography
              variant="h6"
              color="text.primary"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.125rem", sm: "1.25rem" },
                mr: 4,
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
