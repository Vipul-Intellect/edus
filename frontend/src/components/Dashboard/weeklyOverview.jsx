import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, TrendingUp, ChevronRight } from "lucide-react";

const weekData = [
  { day: "Mon", classes: 8,  utilization: 80, color: "bg-blue-500" },
  { day: "Tue", classes: 10, utilization: 95, color: "bg-indigo-500" },
  { day: "Wed", classes: 7,  utilization: 70, color: "bg-violet-500" },
  { day: "Thu", classes: 9,  utilization: 85, color: "bg-blue-500" },
  { day: "Fri", classes: 6,  utilization: 60, color: "bg-indigo-500" },
  { day: "Sat", classes: 3,  utilization: 30, color: "bg-gray-400" },
];

const maxClasses = Math.max(...weekData.map(d => d.classes));

export default function WeeklyOverview() {
  const [activeDay, setActiveDay] = useState(null);

  return (
    <div className="space-y-5">
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <BarChart className="w-5 h-5 text-indigo-600" />
            Weekly Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bar chart visualization */}
          <div className="flex items-end gap-2 h-28 mb-4">
            {weekData.map((day) => {
              const heightPct = (day.classes / maxClasses) * 100;
              const isActive = activeDay === day.day;
              return (
                <button
                  key={day.day}
                  className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                  onClick={() => setActiveDay(isActive ? null : day.day)}
                >
                  <span className={`text-xs font-bold transition-all ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {day.classes}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${isActive ? 'opacity-100 ring-2 ring-indigo-400 ring-offset-1' : 'opacity-70 group-hover:opacity-100'} ${day.color}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {day.day}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active day detail */}
          {activeDay && (() => {
            const d = weekData.find(x => x.day === activeDay);
            return (
              <div className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <p className="text-sm font-bold text-indigo-800">{d.day} — {d.classes} classes</p>
                  <p className="text-xs text-indigo-600">{d.utilization}% room utilization</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-sm">{d.utilization}%</span>
                </div>
              </div>
            );
          })()}

          {/* Progress bars */}
          <div className="space-y-3 mt-4">
            {weekData.map((day) => (
              <div key={day.day} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600">{day.day}</span>
                  <span className="text-xs text-gray-400">{day.classes} classes • {day.utilization}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${day.color}`}
                    style={{ width: `${day.utilization}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}