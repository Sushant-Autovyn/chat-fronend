import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
  const iconColors = {
    primary: 'text-indigo-500',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-rose-500',
    info: 'text-sky-500',
  };

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4 flex flex-col gap-3 hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <Icon className={`h-4 w-4 ${iconColors[color]}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        {trend && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-500" />
            )}
            <span className={trend.isPositive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-500 font-semibold'}>
              {trend.value}
            </span>
            <span>{trend.label}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
