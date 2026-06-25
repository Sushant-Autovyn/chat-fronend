import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: string;
    isPositive: boolean;
    label: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color = 'primary', trend }) => {
  const colorSchemes = {
    primary: {
      bg: 'bg-primary/10 border-primary/20 text-primary',
      glow: 'shadow-glow-primary',
      indicator: 'bg-primary/10 text-primary',
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      glow: 'shadow-glow-success',
      indicator: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      glow: 'shadow-amber-500/10',
      indicator: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    danger: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      glow: 'shadow-rose-500/10',
      indicator: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    info: {
      bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
      glow: 'shadow-indigo-500/10',
      indicator: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
  };

  const scheme = colorSchemes[color];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground font-sans md:text-3xl">{value}</p>
        </div>
        
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${scheme.bg} ${scheme.glow} transition-transform group-hover:scale-105 duration-300`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold ${
            trend.isPositive 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {trend.isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </span>
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
