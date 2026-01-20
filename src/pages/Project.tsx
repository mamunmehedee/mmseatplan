import * as React from "react";
import { useParams, Navigate } from "react-router-dom";

import AuthGate from "@/components/AuthGate";
import SeatingPlannerPage from "@/features/seating/SeatingPlannerPage";

function ProjectInner() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <Navigate to="/dashboard" replace />;

  return <SeatingPlannerPage projectId={id} />;
}

export default function ProjectPage() {
  return (
    <AuthGate>
      <ProjectInner />
    </AuthGate>
  );
}
