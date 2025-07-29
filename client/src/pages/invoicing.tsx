import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { useEffect } from 'react';

export default function Invoicing() {
  const router = useRouter();
  const { user } = useStore();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Invoices</h1>
          <Link
            href="/rooms/new"
            className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Link>
        </div>
        <p className="text-gray-600 mt-2">Manage all your invoices in one place</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No invoices yet</h2>
          <p className="text-gray-600 mb-6">Create your first invoice to get started</p>
          <Link
            href="/rooms/new"
            className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Invoice
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}