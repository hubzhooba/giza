import DashboardLayout from '@/components/DashboardLayout';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function Payments() {
  const router = useRouter();
  const { user } = useStore();

  return (
    <ProtectedPage>
      <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Payments</h1>
        <p className="text-gray-600 mt-2">Track all your incoming and outgoing payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Received</p>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
            <DollarSign className="w-10 h-10 text-primary-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No payments yet</h2>
          <p className="text-gray-600">Your payment history will appear here</p>
        </div>
      </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}