import { FileText, Users, Shield } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export const FeatureBanner = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <FeatureCard
        icon={FileText}
        title="Create"
        description="Draft and configure multi-party documents"
        iconColor="blue"
      />

      <FeatureCard
        icon={Users}
        title="Collect"
        description="Gather cryptographic signatures securely"
        iconColor="green"
      />

      <FeatureCard
        icon={Shield}
        title="Verify"
        description="Ensure authenticity and integrity"
        iconColor="purple"
      />
    </div>
  );
};