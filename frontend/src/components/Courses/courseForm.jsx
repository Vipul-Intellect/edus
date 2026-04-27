import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Save, X } from "lucide-react";
import api from "../../services/api";

export default function CourseForm({ course, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: course?.name || "",
    type: course?.type || "",
    dept_name: course?.dept_name || "",
    faculty_id: course?.faculty_id || "",
    year: course?.year || 1,
    semester: course?.semester || 1,
    credits: course?.credits || 3,
    hours_per_week: course?.hours_per_week || 4
  });

  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [facultyData, sectionsData] = await Promise.all([
          api.getFaculty(),
          api.getSections()
        ]);
        setFaculty(facultyData);

        // Extract unique departments from sections
        const uniqueDepts = [...new Set(
          sectionsData
            .map(s => s.dept_name)
            .filter(Boolean)
        )];
        setDepartments(uniqueDepts);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'year') {
        // Adjust semester to be valid for the new year
        const validSems = [value * 2 - 1, value * 2];
        if (!validSems.includes(newState.semester)) {
          newState.semester = validSems[0];
        }
      }
      return newState;
    });
  };

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {course ? 'Edit Course' : 'Add New Course'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Introduction to Computer Science"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Course Type *</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                placeholder="e.g., Theory, Lab, Practical"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dept_name">Department *</Label>
              <Select value={formData.dept_name} onValueChange={(value) => handleChange('dept_name', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faculty_id">Faculty *</Label>
              <Select value={formData.faculty_id.toString()} onValueChange={(value) => handleChange('faculty_id', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculty.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credits">Credits *</Label>
              <Select value={formData.credits.toString()} onValueChange={(value) => handleChange('credits', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(credit => (
                    <SelectItem key={credit} value={credit.toString()}>{credit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_per_week">Hours/Week *</Label>
              <Select value={formData.hours_per_week.toString()} onValueChange={(value) => handleChange('hours_per_week', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(hour => (
                    <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Select value={formData.year.toString()} onValueChange={(value) => handleChange('year', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester *</Label>
              <Select value={formData.semester.toString()} onValueChange={(value) => handleChange('semester', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(formData.year * 2 - 1).toString()}>{formData.year * 2 - 1}</SelectItem>
                  <SelectItem value={(formData.year * 2).toString()}>{formData.year * 2}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>



          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {course ? 'Update' : 'Create'} Course
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}