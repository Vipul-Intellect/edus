import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

const colorClasses = {
  blue: {
    gradient: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-600",
    iconBg: "bg-blue-500/10",
    trendPos: "text-emerald-600 bg-emerald-50",
    trendNeg: "text-red-500 bg-red-50",
  },
  green: {
    gradient: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
    trendPos: "text-emerald-600 bg-emerald-50",
    trendNeg: "text-red-500 bg-red-50",
  },
  purple: {
    gradient: "from-violet-500 to-violet-600",
    bgLight: "bg-violet-50",
    border: "border-violet-100",
    text: "text-violet-600",
    iconBg: "bg-violet-500/10",
    trendPos: "text-emerald-600 bg-emerald-50",
    trendNeg: "text-red-500 bg-red-50",
  },
  orange: {
    gradient: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-600",
    iconBg: "bg-amber-500/10",
    trendPos: "text-emerald-600 bg-emerald-50",
    trendNeg: "text-red-500 bg-red-50",
  },
  pink: {
    gradient: "from-rose-500 to-pink-500",
    bgLight: "bg-rose-50",
    border: "border-rose-100",
    text: "text-rose-600",
    iconBg: "bg-rose-500/10",
    trendPos: "text-emerald-600 bg-emerald-50",
    trendNeg: "text-red-500 bg-red-50",
  },
  indigo: {
    gradient: "from-indigo-500 to-indigo-600",
    bgLight: "bg-indigo-50",
    border: "border-indigo-100",
    text: "text-indigo-600",
    iconBg: "bg-indigo-500/10",
    trendPos: "text-emerald-600 bg-emerald-50",
    trendNeg: "text-red-500 bg-red-50",
  },
};

export default function StatCard({ title, value, color = "blue", icon, isLoading, onClick, trend, trendLabel }) {
  const colors = colorClasses[color] || colorClasses.blue;
  const Icon = icon;
  const isPositiveTrend = trend !== undefined ? trend >= 0 : true;
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;

  return (
    <div
      className={`group cursor-pointer relative overflow-hidden rounded-2xl border-2 ${colors.border} ${colors.bgLight} 
        shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${onClick ? '' : 'cursor-default'}`}
      onClick={onClick}
    >
      {/* Decorative gradient bar at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />

      <div className="p-6 pt-7">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-12 w-24 mt-2" />
            ) : (
              <p className={`text-5xl font-extrabold ${colors.text} group-hover:scale-105 transition-transform duration-300 origin-left`}>
                {value}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-2xl ${colors.iconBg} group-hover:scale-110 transition-transform duration-300`}>
            {Icon && <Icon className={`w-7 h-7 ${colors.text}`} />}
          </div>
        </div>

        {/* Trend indicator */}
        <div className="mt-4 flex items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-5 w-28" />
          ) : trend !== undefined ? (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositiveTrend ? colors.trendPos : colors.trendNeg}`}>
              <TrendIcon className="w-3 h-3" />
              {isPositiveTrend ? '+' : ''}{trend}% {trendLabel || 'vs last month'}
            </span>
          ) : (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${colors.trendPos}`}>
              <TrendingUp className="w-3 h-3" />
              Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
}