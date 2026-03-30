import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils/navigation";
import { Plus, Calendar, BookOpen, Users, Bell, Video } from "lucide-react";

export default function QuickActions({ onAction }) {
  const actions = [
    {
      label: "Create Meeting",
      icon: Video,
      variant: "default",
      className: "bg-indigo-600 hover:bg-indigo-700 text-white",
      action: "create_meeting"
    },
    {
      label: "View Timetable",
      url: createPageUrl("Timetable"),
      icon: Calendar,
      variant: "default",
      className: "bg-blue-600 hover:bg-blue-700 text-white"
    },
    {
      label: "Add Course",
      url: createPageUrl("Courses"),
      icon: BookOpen,
      variant: "outline"
    },
    {
      label: "Add Teacher",
      url: createPageUrl("Teachers"),
      icon: Users,
      variant: "outline"
    },
    {
      label: "Notify",
      action: "send_notification",
      icon: Bell,
      variant: "outline"
    }
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        action.url ? (
          <Link key={action.label} to={action.url}>
            <Button
              variant={action.variant}
              className={`gap-2 hover:scale-105 transition-all duration-300 shadow-lg ${action.className || ''}`}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button
            key={action.label}
            variant={action.variant}
            className={`gap-2 hover:scale-105 transition-all duration-300 shadow-lg ${action.className || ''}`}
            onClick={() => onAction && onAction(action.action)}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </Button>
        )
      ))}
    </div>
  );
}