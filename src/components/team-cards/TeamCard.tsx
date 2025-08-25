import { ExpandLess, ExpandMore } from "@mui/icons-material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import { useState } from "react";

// Team Card Component with Progress Bar
interface TeamCardProps {
  title: string;
  team: string;
  children: React.ReactNode;
  progress: number;
  filledFields: number;
  totalFields: number;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function TeamCard({
  title,
  team,
  children,
  progress,
  filledFields,
  totalFields,
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

      {team !== "Ops" && (
        <div style={{ padding: "0 16px 8px" }}>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, progress))}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 12, color: "#667085" }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#344054" }}>
              {filledFields}/{totalFields} fields
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
