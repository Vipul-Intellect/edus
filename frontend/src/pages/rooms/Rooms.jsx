import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import RoomCard from "../../components/rooms/RoomCard";
import RoomForm from "../../components/rooms/RoomForm";
import RoomFilters from "../../components/rooms/RoomFilters";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const filterRooms = useCallback(() => {
    let filtered = rooms;

    if (searchTerm) {
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.resources.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(room => {
        const roomType = room.name.toLowerCase().includes('lab') ? 'Laboratory' :
                        room.name.toLowerCase().includes('auditorium') ? 'Auditorium' :
                        room.name.toLowerCase().includes('seminar') ? 'Seminar Room' :
                        room.resources.toLowerCase().includes('computer') ? 'Computer Lab' : 'Classroom';
        return roomType === filterType;
      });
    }

    if (filterBuilding !== "all") {
      filtered = filtered.filter(room => {
        // Extract building from room name (e.g., "Room-101" -> building not specified, so skip filtering)
        // For now, we'll treat all rooms as being in the same building or skip this filter
        return true; // Remove this line if building filtering is needed
      });
    }

    setFilteredRooms(filtered);
  }, [rooms, searchTerm, filterType, filterBuilding]);

  useEffect(() => {
    filterRooms();
  }, [filterRooms]);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const [roomsData, statusData] = await Promise.all([
        api.getRoomsLegacy(),
        api.getRoomStatus().catch(() => ({ occupied_rooms: [], free_rooms: [], unmarked_rooms: [] }))
      ]);

      const occupiedIds = new Set((statusData.occupied_rooms || []).map(r => r.room_id || r.id));

      const enhancedRooms = roomsData.map(room => {
        // Extract room number and building from name if formatted like "BuildingName-101"
        // Otherwise just use the name as the number.
        let number = room.name || `ID-${room.id}`;
        let building = "Main Campus";
        if (room.name && room.name.includes('-')) {
            const parts = room.name.split('-');
            building = parts[0];
            number = parts.slice(1).join('-');
        }

        const roomType = room.name.toLowerCase().includes('lab') ? 'Laboratory' :
                         room.name.toLowerCase().includes('auditorium') ? 'Auditorium' :
                         room.name.toLowerCase().includes('seminar') ? 'Seminar Room' :
                         room.resources?.toLowerCase().includes('computer') ? 'Computer Lab' : 'Classroom';

        const isActive = occupiedIds.has(room.id);

        return {
          ...room,
          number,
          building,
          type: roomType,
          is_active: isActive, // We equate "active" to "currently occupied/in-use"
          facilities: room.resources ? room.resources.split(',').map(s => s.trim()) : []
        };
      });
      
      setRooms(enhancedRooms);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (roomData) => {
    if (editingRoom) {
      // Note: api.js doesn't have an update method for rooms, so this might need to be added
      // For now, we'll skip the update functionality
      console.warn("Update functionality not implemented in API");
    } else {
      await api.addRoom(roomData);
    }
    setShowForm(false);
    setEditingRoom(null);
    loadRooms();
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setShowForm(true);
  };

  const uniqueBuildings = [...new Set(rooms.map(room => room.building))];

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
              Rooms
            </h1>
            <p className="text-lg text-gray-600">Manage classrooms and facilities</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Room
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search rooms by number or building..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-blue-200"
              />
            </div>
          </div>
          <RoomFilters
            filterType={filterType}
            setFilterType={setFilterType}
            filterBuilding={filterBuilding}
            setFilterBuilding={setFilterBuilding}
            buildings={uniqueBuildings}
          />
        </div>

        {showForm && (
          <RoomForm
            room={editingRoom}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingRoom(null);
            }}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-200">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : (
            filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onEdit={handleEdit}
              />
            ))
          )}
        </div>

        {!isLoading && filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No rooms found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterType !== "all" || filterBuilding !== "all"
                ? "Try adjusting your search or filters" 
                : "Get started by adding your first room"
              }
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Room
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}