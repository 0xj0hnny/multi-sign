import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorClasses = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/20',
    glow: 'group-hover:shadow-blue-500/40'
  },
  green: {
    gradient: 'from-green-500 to-green-600',
    shadow: 'shadow-green-500/20',
    glow: 'group-hover:shadow-green-500/40'
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/20',
    glow: 'group-hover:shadow-purple-500/40'
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    shadow: 'shadow-orange-500/20',
    glow: 'group-hover:shadow-orange-500/40'
  },
  red: {
    gradient: 'from-red-500 to-red-600',
    shadow: 'shadow-red-500/20',
    glow: 'group-hover:shadow-red-500/40'
  }
};

export const FeatureCard = ({ icon: Icon, title, description, iconColor }: FeatureCardProps) => {
  const colors = colorClasses[iconColor];

  return (
    <Card className="group relative overflow-hidden border">
      <CardContent className="relative p-4">
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Icon with gradient background */}
          <div className={`relative p-2 rounded-2xl bg-gradient-to-br ${colors.gradient} shadow-lg ${colors.shadow} ${colors.glow} `}>
            <Icon className="h-4 w-4 text-white" strokeWidth={2} />
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold tracking-tight">
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
