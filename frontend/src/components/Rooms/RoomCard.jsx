import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Edit2, Users, MapPin, Settings } from "lucide-react";

const typeColors = {
  Classroom: "bg-blue-100 text-blue-800 border-blue-200",
  Laboratory: "bg-purple-100 text-purple-800 border-purple-200",
  Auditorium: "bg-red-100 text-red-800 border-red-200",
  "Seminar Room": "bg-green-100 text-green-800 border-green-200",
  "Computer Lab": "bg-orange-100 text-orange-800 border-orange-200"
};

export default function RoomCard({ room, onEdit }) {
  return (
    <Card className={`bg-white/80 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-all duration-300`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Room {room.number}</h3>
              <p className="text-sm text-gray-500">{room.building}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(room)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={typeColors[room.type] || "bg-gray-100 text-gray-800 border-gray-200"}>
            {room.type}
          </Badge>
          <Badge className={room.is_active ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" : "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"}>
            {room.is_active ? "Occupied (Active)" : "Available"}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>Capacity: {room.capacity} students</span>
          </div>
          {room.floor && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Floor {room.floor}</span>
            </div>
          )}
        </div>

        {room.facilities && room.facilities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Facilities</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {room.facilities.slice(0, 3).map((facility, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {facility}
                </Badge>
              ))}
              {room.facilities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{room.facilities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}