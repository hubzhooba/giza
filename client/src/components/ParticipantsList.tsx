import { SecureRoom } from '@/types';
import { Users, Mail, CheckCircle, Clock, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface ParticipantsListProps {
  room: SecureRoom;
}

export default function ParticipantsList({ room }: ParticipantsListProps) {
  const copyInviteLink = () => {
    // Generate a review token for the contract
    const token = btoa(JSON.stringify({ 
      contractId: room.id, 
      action: 'review',
      timestamp: Date.now() 
    }));
    const inviteUrl = `${window.location.origin}/contracts/review/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invite link copied to clipboard!');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Users className="w-5 h-5 mr-2 text-primary-600" />
          Participants
        </h3>
        <button
          onClick={copyInviteLink}
          className="flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          <Copy className="w-4 h-4 mr-1" />
          Copy Invite Link
        </button>
      </div>

      <div className="space-y-4">
        {room.participants.map((participant) => (
          <div
            key={participant.userId}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-primary-700 font-semibold">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{participant.name}</p>
                <p className="text-sm text-gray-500 flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  {participant.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 text-xs rounded-full ${
                  participant.role === 'creator'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {participant.role}
              </span>
              
              {participant.hasJoined ? (
                <span className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Joined
                </span>
              ) : (
                <span className="flex items-center text-yellow-600 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  Pending
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Security Note:</strong> All participants must join the room to access documents.
          Each participant's public key is verified to ensure secure communication.
        </p>
      </div>
    </div>
  );
}