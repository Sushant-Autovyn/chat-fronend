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
  const palette = {
    primary: {
      strip: 'bg-blue-500',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
    },
    success: {
      strip: 'bg-emerald-500',
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
    },
    warning: {
      strip: 'bg-amber-400',
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-600',
    },
    danger: {
      strip: 'bg-rose-500',
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-600',
    },
    info: {
      strip: 'bg-sky-500',
      iconBg: 'bg-sky-50',
      iconText: 'text-sky-600',
    },
  };

  const { strip, iconBg, iconText } = palette[color];

  return (
    <div className="relative rounded-lg border border-border bg-card overflow-hidden flex flex-col gap-3 px-4 py-4 hover:shadow-sm transition-shadow">
      {/* Left color strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${strip}`} />

      <div className="flex items-center justify-between pl-1">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconText}`} />
        </div>
      </div>

      <div className="pl-1">
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        {trend && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-500" />
            )}
            <span className={trend.isPositive ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
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
