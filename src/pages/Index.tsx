import AuthGate from "@/components/AuthGate";
import SeatingPlannerPage from "@/features/seating/SeatingPlannerPage";

const Index = () => {
  return (
    <AuthGate>
      <SeatingPlannerPage />
    </AuthGate>
  );
};

export default Index;
