import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Shield, 
  Users, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Settings,
  MoreVertical,
  Activity,
  Globe,
  PlusCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import ApiService from '../../services/api';

const SuperAdminDashboard = () => {
  const [colleges, setColleges] = useState([]);
  const [stats, setStats] = useState({ total_colleges: 0, total_users: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCollege, setNewCollege] = useState({
    name: '',
    college_code: '',
    admin_email: '',
    admin_username: 'admin',
    admin_password: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [collegesData, statsData] = await Promise.all([
        ApiService.fetchColleges(),
        ApiService.getPlatformStats()
      ]);
      setColleges(collegesData || []);
      setStats(statsData || { total_colleges: 0, total_users: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (collegeId, featureName, currentValue) => {
    try {
      const updatedFlags = { [featureName]: !currentValue };
      await ApiService.updateCollege(collegeId, { feature_flags: updatedFlags });
      
      // Update local state
      setColleges(colleges.map(c => {
        if (c.id === collegeId) {
          return {
            ...c,
            feature_flags: { ...c.feature_flags, [featureName]: !currentValue }
          };
        }
        return c;
      }));
    } catch (err) {
      alert(`Failed to update feature: ${err.message}`);
    }
  };

  const handleCreateCollege = async (e) => {
    e.preventDefault();
    try {
      await ApiService.createCollege(newCollege);
      setIsModalOpen(false);
      setNewCollege({ name: '', college_code: '', admin_email: '', admin_username: 'admin', admin_password: '' });
      fetchData();
    } catch (err) {
      alert(`Failed to create college: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Initializing Platform Engine...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Platform Control Plane</h1>
          <p className="text-gray-500 mt-1">Manage institutions, feature availability, and platform health.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <PlusCircle size={20} />
          Onboard New College
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Globe size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Hosted Colleges</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_colleges}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Platform Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">System Health</p>
            <p className="text-2xl font-bold text-green-600">Optimal</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Security Gate</p>
            <p className="text-2xl font-bold text-gray-900">Active</p>
          </div>
        </div>
      </div>

      {/* College List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Managed Institutions</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
            <Terminal size={14} />
            Global Context Active
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Institution</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Features</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {colleges.map((college) => (
                <tr key={college.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{college.name}</div>
                    <div className="text-xs text-gray-500">ID: {college.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                      {college.college_code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {college.is_active ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                        <XCircle size={14} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => handleToggleFeature(college.id, 'ai_chatbot', college.feature_flags?.ai_chatbot)}
                        className={`flex items-center gap-1 text-xs font-medium ${college.feature_flags?.ai_chatbot ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {college.feature_flags?.ai_chatbot ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        AI Chat
                      </button>
                      <button 
                         onClick={() => handleToggleFeature(college.id, 'google_calendar', college.feature_flags?.google_calendar)}
                         className={`flex items-center gap-1 text-xs font-medium ${college.feature_flags?.google_calendar ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {college.feature_flags?.google_calendar ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        G-Cal
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 capitalize font-medium">{college.subscription_tier}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                      <Settings size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create College Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 bg-gray-50 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Onboard Institution</h3>
              <p className="text-xs text-gray-500">Initialize a new secure tenant with a primary admin.</p>
            </div>
            <form onSubmit={handleCreateCollege} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">College Full Name</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={newCollege.name}
                  onChange={e => setNewCollege({...newCollege, name: e.target.value})}
                  placeholder="e.g. Indian Institute of Technology"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">College Code</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newCollege.college_code}
                    onChange={e => setNewCollege({...newCollege, college_code: e.target.value.toUpperCase()})}
                    placeholder="e.g. IITB"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Admin Username</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newCollege.admin_username}
                    onChange={e => setNewCollege({...newCollege, admin_username: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Admin Email</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={newCollege.admin_email}
                  onChange={e => setNewCollege({...newCollege, admin_email: e.target.value})}
                  placeholder="admin@college.edu"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Primary Password</label>
                <input 
                  type="password" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={newCollege.admin_password}
                  onChange={e => setNewCollege({...newCollege, admin_password: e.target.value})}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  Confirm & Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
