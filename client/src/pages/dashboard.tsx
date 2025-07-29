import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { 
  Shield, FileText, DollarSign, Clock, Home, Settings, 
  ChevronRight, Users, TrendingUp, Check, CreditCard,
  FileSignature, PiggyBank, BarChart3, Send
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function Dashboard() {
  const router = useRouter();
  const { user, rooms } = useStore();
  const [completedSteps, setCompletedSteps] = useState({
    companyAccount: true,
    firstInvoice: false,
    sendInvoice: false,
    getInvoicePaid: false,
  });

  const stats = {
    receivedThisMonth: 0,
    toReceiveThisMonth: 0,
    invoicesToGetPaid: 0,
  };

  const onboardingSteps = [
    {
      id: 1,
      title: 'Set up your company account',
      description: 'This is how your company will appear to clients and partners.',
      completed: completedSteps.companyAccount,
      icon: Shield,
      action: 'Done!',
      href: '/settings',
    },
    {
      id: 2,
      title: 'Create your 1st invoice',
      description: 'You can create as many invoices as you want for crypto & fiat.',
      completed: completedSteps.firstInvoice,
      icon: FileText,
      action: 'Do It Now',
      href: '/rooms/new',
    },
    {
      id: 3,
      title: 'Send your 1st invoice',
      description: 'Get paid in crypto, fiat, flat-to-crypto or crypto-to-fiat.',
      completed: completedSteps.sendInvoice,
      icon: Send,
      action: 'Do It Now',
      href: '/invoicing',
    },
    {
      id: 4,
      title: 'Get your invoice paid',
      description: 'Using Request will get you paid in no time!',
      completed: completedSteps.getInvoicePaid,
      icon: DollarSign,
      action: 'Do It Now',
      href: '/payments',
    },
  ];

  return (
    <ProtectedPage>
      <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-normal">
          👋 Hey <span className="font-semibold">{user?.name || 'there'}</span>
        </h1>
      </div>

      {/* Onboarding Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Let's get you started!</h2>
          <button className="text-primary-600 hover:text-primary-700 text-sm">
            I want to do this later
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {onboardingSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="text-center">
                <div className="flex flex-col items-center">
                  <div className="text-sm text-gray-500 mb-2">{step.id}</div>
                  <div className="relative mb-4">
                    <div className={`w-32 h-32 rounded-lg flex items-center justify-center ${
                      step.completed ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      {step.completed ? (
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-10 h-10 text-white" />
                        </div>
                      ) : (
                        <Icon className="w-16 h-16 text-primary-600" />
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 px-2">{step.description}</p>
                  {step.completed ? (
                    <span className="text-green-600 font-medium">Done!</span>
                  ) : (
                    <Link
                      href={step.href}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {step.action}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Get Paid Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Get Paid</h2>
        <p className="text-gray-600 mb-6">Create invoices and get paid in crypto by your clients.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-3xl font-bold">${stats.receivedThisMonth.toFixed(2)}</h3>
            <p className="text-gray-600">Received this month</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-3xl font-bold">${stats.toReceiveThisMonth.toFixed(2)}</h3>
            <p className="text-gray-600">To receive this month</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-3xl font-bold">{stats.invoicesToGetPaid}</h3>
            <p className="text-gray-600">Invoices to get paid</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <Link
              href="/rooms/new"
              className="block w-full bg-primary-600 text-white text-center py-3 px-4 rounded-lg hover:bg-primary-700 transition"
            >
              Create New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Monthly Pay-ins</h3>
            <select className="text-sm border-gray-300 rounded">
              <option>3m</option>
              <option>6m</option>
              <option>1y</option>
            </select>
          </div>
          <div className="text-gray-500">Cash Inflows</div>
          <div className="h-48 flex items-center justify-center text-gray-400">
            <BarChart3 className="w-16 h-16" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Your Top Clients</h3>
            <p className="text-sm text-gray-500 mb-4">Last 3 months</p>
            <div className="flex items-center justify-center h-32">
              <Users className="w-16 h-16 text-gray-300" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Your Top Currencies</h3>
            <p className="text-sm text-gray-500 mb-4">Last 3 months</p>
            <div className="flex items-center justify-center h-32">
              <DollarSign className="w-16 h-16 text-gray-300" />
            </div>
          </div>
        </div>
      </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}