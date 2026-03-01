import React from "react";
import { TrendingUp, IndianRupee, Sprout } from "lucide-react";

interface Scheme {
  id: string;
  name: string;
  description: string;
  amount?: string;
  deadline?: string;
  category: string;
}

interface Props {
  scheme: Scheme;
  index: number;
}

const categoryColors: Record<string, string> = {
  "subsidy": "bg-secondary-light text-secondary",
  "loan": "bg-primary-light text-primary",
  "insurance": "bg-accent/10 text-accent",
};

const categoryIcons: Record<string, React.ReactNode> = {
  "subsidy": <IndianRupee size={16} />,
  "loan": <TrendingUp size={16} />,
  "insurance": <Sprout size={16} />,
};

export default function SchemeCard({ scheme, index }: Props) {
  const colorClass = categoryColors[scheme.category] || "bg-muted text-muted-foreground";
  const icon = categoryIcons[scheme.category] || <Sprout size={16} />;

  return (
    <div
      className="card-krishi p-4 cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${colorClass}`}>
          {icon}
          {scheme.category}
        </span>
        {scheme.amount && (
          <span className="text-sm font-bold text-primary">₹{scheme.amount}</span>
        )}
      </div>
      <h3 className="font-bold text-base text-foreground mb-1 leading-tight">{scheme.name}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{scheme.description}</p>
      {scheme.deadline && (
        <p className="text-xs text-secondary mt-2 font-medium">अंतिम तिथि: {scheme.deadline}</p>
      )}
    </div>
  );
}

export function SchemeCardSkeleton() {
  return (
    <div className="card-krishi p-4 space-y-3">
      <div className="flex justify-between">
        <div className="skeleton-pulse h-6 w-20" />
        <div className="skeleton-pulse h-6 w-16" />
      </div>
      <div className="skeleton-pulse h-5 w-3/4" />
      <div className="skeleton-pulse h-4 w-full" />
      <div className="skeleton-pulse h-4 w-2/3" />
    </div>
  );
}
