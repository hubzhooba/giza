import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { 
  Tent, Plus, Clock, CheckCircle, Users, 
  FileText, DollarSign, Search, Filter
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function MyTents() {
  const router = useRouter();
  const { rooms, user, loadRooms } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'completed'>('all');
  
  // Ensure fresh data on page load
  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user, loadRooms]);

  // Filter tents based on search and status
  const filteredTents = rooms.filter(tent => {
    const matchesSearch = tent.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeTents = rooms.filter(r => r.status === 'active');
  const pendingTents = rooms.filter(r => r.status === 'pending');
  const completedTents = rooms.filter(r => r.status === 'completed');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Users className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <ProtectedPage>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">My Tents</h1>
            <p className="text-gray-600 mt-2">
              Manage all your secure contract tents in one place
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tents</p>
                  <p className="text-2xl font-bold text-gray-900">{rooms.length}</p>
                </div>
                <Tent className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-blue-600">{activeTents.length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingTents.length}</p>
                </div>
                <Users className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedTents.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Create Button */}
              <Link
                href="/tents/new"
                className="inline-flex items-center justify-center bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Tent
              </Link>
            </div>
          </div>

          {/* Tents List */}
          {filteredTents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Tent className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No tents found' : 'No tents yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first secure contract tent to get started'}
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Link
                  href="/tents/new"
                  className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Tent
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tent Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTents.map((tent) => (
                    <tr key={tent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Tent className="w-5 h-5 text-primary-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {tent.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {tent.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tent.status)}`}>
                          {getStatusIcon(tent.status)}
                          <span className="ml-1 capitalize">{tent.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {tent.inviteeId ? '2/2' : '1/2'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tent.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/tents/${tent.id}`}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}