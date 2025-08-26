import { ExpandLess, ExpandMore } from "@mui/icons-material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import { useState } from "react";

// Team Card Component - Simplified without progress bar
interface TeamCardProps {
  title: string;
  children: React.ReactNode;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function TeamCard({
  title,
  children,
  isCollapsible = false,
  defaultCollapsed = false,
}: TeamCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <Card variant="outlined">
      <CardHeader
        onClick={() => {
          if (isCollapsible) setIsCollapsed(!isCollapsed);
        }}
        sx={{ cursor: isCollapsible ? "pointer" : "default" }}
        title={title}
        action={
          isCollapsible ? (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
            >
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          ) : undefined
        }
      />

      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
        <CardContent>{children}</CardContent>
      </Collapse>
    </Card>
  );
}
