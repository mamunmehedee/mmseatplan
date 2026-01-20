import AuthGate from "@/components/AuthGate";
import { Navigate } from "react-router-dom";

const Index = () => {
  return (
    <AuthGate>
      <Navigate to="/dashboard" replace />
    </AuthGate>
  );
};

export default Index;
