import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Calendar, Filter, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Timetable() {
  const [timetable, setTimetable] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterDept, setFilterDept] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterSection, setFilterSection] = useState("all");

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const TIMES = ["09:00", "10:00", "11:00", "12:00", "01:00", "02:00", "03:00", "04:00"];

  const areFiltersComplete = filterDept !== "all" && filterYear !== "all" && filterSection !== "all";

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [filterDept, filterYear, filterSection]);

  const loadMetadata = async () => {
    try {
      const [deptsData, sectionsData] = await Promise.all([
        api.getDepartments(),
        api.getSections()
      ]);

      const deptList = Array.isArray(deptsData) ? deptsData : (deptsData?.departments || deptsData?.data || []);
      const sectionList = Array.isArray(sectionsData) ? sectionsData : (sectionsData?.sections || sectionsData?.data || []);

      setDepartments(deptList);
      setSections(sectionList);
    } catch (error) {
      console.error('Error loading metadata:', error);
      setDepartments([]);
      setSections([]);
    }
  };

  const loadTimetable = async () => {
    if (!areFiltersComplete) {
      setTimetable([]);
      return;
    }

    try {
      setIsLoading(true);
      const filters = {
        dept_name: filterDept,
        year: filterYear,
        section: filterSection
      };

      const timetableData = await api.getTimetable(filters);
      setTimetable(timetableData || []);
    } catch (error) {
      console.error('Error loading timetable:', error);
      setTimetable([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!window.confirm("Generate new timetable? This will replace the existing timetable.")) {
      return;
    }

    try {
      setIsGenerating(true);
      const result = await api.generateTimetable();
      alert(result.message || "Timetable generated successfully!");
      if (areFiltersComplete) {
        loadTimetable(); // Reload to show new timetable if filters are ready
      }
    } catch (error) {
      console.error('Error generating timetable:', error);
      alert(`Error: ${error.message || 'Failed to generate timetable'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getClassForSlot = (day, time) => {
    return timetable.find(entry => {
      // Clean up inputs to ensure robust matching
      const entryDay = entry.day?.trim();
      const entryTime = entry.start_time?.trim();
      const targetDay = day.trim();
      const targetTime = time.trim();

      return entryDay === targetDay && entryTime === targetTime;
    });
  };

  const filteredDepartments = filterDept === "all"
    ? (Array.isArray(departments) ? departments : [])
    : (Array.isArray(departments) ? departments : []).filter(d => d.dept_name === filterDept);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Timetable Management
            </h1>
            <p className="text-gray-600 mt-1">Generate and view class timetables</p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:scale-105 transition-all duration-300"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Timetable
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setFilterSection("all");
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
              >
                <option value="all">All Departments</option>
                {(Array.isArray(departments) ? departments : []).map(dept => (
                  <option key={dept.id} value={dept.dept_name}>{dept.dept_name}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setFilterSection("all");
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
              >
                <option value="all">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
              >
                <option value="all">All Sections</option>
                {(Array.isArray(sections) ? sections : [])
                  .filter(s =>
                    (filterDept === "all" || s.dept_name === filterDept) &&
                    (filterYear === "all" || s.year === parseInt(filterYear))
                  )
                  .map(section => (
                    <option key={section.id} value={section.name}>Section {section.name}</option>
                  ))
                }
              </select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600">Loading timetable...</p>
            </CardContent>
          </Card>
        ) : !areFiltersComplete ? (
          <Card className="shadow-lg border-2 border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="p-12 text-center">
              <Filter className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Select Filters to View Timetable</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Please select a <strong>Department</strong>, <strong>Year</strong>, and <strong>Section</strong> from the dropdowns above to view the specific class schedule.
              </p>
            </CardContent>
          </Card>
        ) : timetable.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No timetable found</h3>
              <p className="text-gray-500 mb-6">
                Click "Generate Timetable" to create a new schedule
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardContent className="p-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <th className="border border-gray-300 p-3 text-left font-semibold">Time</th>
                    {(Array.isArray(DAYS) ? DAYS : []).map(day => (
                      <th key={day} className="border border-gray-300 p-3 text-center font-semibold">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(TIMES) ? TIMES : []).map(time => (
                    <tr key={time} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3 font-medium text-gray-700 bg-gray-50">
                        {time}
                      </td>
                      {(Array.isArray(DAYS) ? DAYS : []).map(day => {
                        const classEntry = getClassForSlot(day, time);
                        return (
                          <td key={`${day}-${time}`} className="border border-gray-300 p-2">
                            {classEntry ? (
                              <div className="bg-white p-2 text-center h-full flex flex-col justify-center items-center shadow-sm border border-gray-100 rounded-md hover:shadow-md transition-shadow">
                                <div className="font-bold text-gray-800 text-sm mb-1 leading-tight">
                                  {classEntry.course}
                                </div>
                                <div className="text-xs text-gray-600 font-medium">
                                  {classEntry.faculty}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {classEntry.room} • Sec {classEntry.section}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-400 text-sm py-4">
                                Free
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {timetable.length > 0 && (
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600">{timetable.length}</div>
                  <div className="text-sm text-gray-600">Total Classes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {new Set((Array.isArray(timetable) ? timetable : []).map(t => t.course)).size}
                  </div>
                  <div className="text-sm text-gray-600">Unique Courses</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">
                    {new Set((Array.isArray(timetable) ? timetable : []).map(t => t.faculty)).size}
                  </div>
                  <div className="text-sm text-gray-600">Faculty Members</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-pink-600">
                    {new Set((Array.isArray(timetable) ? timetable : []).map(t => t.room)).size}
                  </div>
                  <div className="text-sm text-gray-600">Rooms Used</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}