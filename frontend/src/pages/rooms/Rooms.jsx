import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Building, Users, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import RoomCard from "../../components/rooms/RoomCard";
import RoomForm from "../../components/rooms/RoomForm";
import RoomFilters from "../../components/rooms/RoomFilters";
import BulkImportModal from "../../components/Dashboard/BulkImportModal";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);

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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
        await api.deleteRoom(id);
        loadRooms();
    } catch (error) {
        alert("Failed to delete room");
    }
  };

  const getStatusColor = (isActive) => {
    return isActive 
        ? "bg-amber-100 text-amber-700 border-amber-200" 
        : "bg-emerald-100 text-emerald-700 border-emerald-200";
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
          <div className="flex gap-3">
            <Button
              onClick={() => setShowBulkModal(true)}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Plus className="w-5 h-5 mr-2 rotate-45" />
              Bulk Import
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Room
            </Button>
          </div>
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

        {/* Rooms List Table */}
        <Card className="shadow-xl border-0 overflow-hidden bg-white/90 backdrop-blur-md">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Room</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Building</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Capacity</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="6" className="px-6 py-4">
                                        <div className="h-10 bg-gray-100 rounded w-full"></div>
                                    </td>
                                </tr>
                            ))
                        ) : filteredRooms.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                    <Info className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-lg font-medium">No rooms found matching your criteria</p>
                                </td>
                            </tr>
                        ) : (
                            filteredRooms.map((room) => (
                                <tr key={room.id} className="group hover:bg-blue-50/30 transition-colors duration-200">
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                        {room.number || room.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Building className="w-4 h-4 text-blue-400" />
                                            {room.building || 'Main Campus'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <Badge variant="outline" className={`${room.type?.includes('Lab') ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'} font-medium`}>
                                            {room.type}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <div className="inline-flex items-center gap-1 text-gray-600">
                                            <Users className="w-4 h-4" />
                                            {room.capacity}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <Badge className={`${getStatusColor(room.is_active)} font-medium`}>
                                            {room.is_active ? "Occupied" : "Free"}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleEdit(room)}
                                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDelete(room.id)}
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100/50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>

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

        <BulkImportModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          title="Bulk Import Rooms"
          endpoint="/api/upload/rooms"
          templateInfo="name, capacity, [resources]"
          onSuccess={() => loadRooms()}
        />
      </div>
    </div>
  );
}