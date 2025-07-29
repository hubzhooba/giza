import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Plus, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function Contracts() {
  const router = useRouter();
  const { user, rooms } = useStore();

  return (
    <ProtectedPage>
      <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Contracts</h1>
          <Link
            href="/rooms/new"
            className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Contract
          </Link>
        </div>
        <p className="text-gray-600 mt-2">Manage your secure contract rooms</p>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No contracts yet</h2>
            <p className="text-gray-600 mb-6">Create a secure room to start your first contract</p>
            <Link
              href="/rooms/new"
              className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Secure Room
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <Shield className="w-8 h-8 text-primary-600" />
                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    room.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : room.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {room.status}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{room.name}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {room.participants.length} participants
              </p>
              <p className="text-xs text-gray-500">
                Created {new Date(room.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
      </DashboardLayout>
    </ProtectedPage>
  );
}