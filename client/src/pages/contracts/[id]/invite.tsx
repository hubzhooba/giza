import { useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { Users, Mail, Send, Copy, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function InviteToContract() {
  const router = useRouter();
  const { id } = router.query;
  const { rooms, updateRoom } = useStore();
  const [invites, setInvites] = useState([{ email: '', name: '' }]);
  const [sending, setSending] = useState(false);
  
  const room = rooms.find(r => r.id === id);

  if (!room) {
    return (
      <ProtectedPage>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Contract not found</p>
          </div>
        </DashboardLayout>
      </ProtectedPage>
    );
  }

  const addInvite = () => {
    setInvites([...invites, { email: '', name: '' }]);
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: 'email' | 'name', value: string) => {
    const newInvites = [...invites];
    newInvites[index][field] = value;
    setInvites(newInvites);
  };

  const generateReviewLink = (email: string) => {
    const token = btoa(JSON.stringify({ 
      contractId: room.id, 
      email, 
      action: 'review',
      timestamp: Date.now() 
    }));
    return `${window.location.origin}/contracts/review/${token}`;
  };

  const handleSendInvites = async () => {
    setSending(true);
    try {
      // Add participants to room
      const newParticipants = invites
        .filter(i => i.email && i.name)
        .map(invite => ({
          userId: uuidv4(),
          email: invite.email,
          name: invite.name,
          role: 'signer' as const,
          hasJoined: false,
        }));

      updateRoom(room.id, {
        participants: [...room.participants, ...newParticipants],
      });

      // In production, send actual emails with review links
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Invitations sent successfully!');
      router.push(`/contracts/${room.id}`);
    } catch (error) {
      toast.error('Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  const copyAllLinks = () => {
    const links = invites
      .filter(i => i.email)
      .map(i => `${i.name || i.email}: ${generateReviewLink(i.email)}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(links);
    toast.success('All review links copied!');
  };

  return (
    <ProtectedPage>
      <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Invite Parties to Review Contract</h1>
          <p className="text-gray-600 mt-2">
            Send invitations for others to review and sign "{room.name}"
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary-600" />
                Contract Parties
              </h2>
              <button
                onClick={copyAllLinks}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy All Links
              </button>
            </div>

            <div className="space-y-4">
              {invites.map((invite, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={invite.name}
                        onChange={(e) => updateInvite(index, 'name', e.target.value)}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => updateInvite(index, 'email', e.target.value)}
                        className="input"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  {invite.email && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600 mb-1">Review link:</p>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={generateReviewLink(invite.email)}
                          readOnly
                          className="flex-1 text-xs bg-white px-2 py-1 rounded border"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generateReviewLink(invite.email));
                            toast.success('Link copied!');
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {invites.length > 1 && (
                    <button
                      onClick={() => removeInvite(index)}
                      className="mt-3 text-red-600 hover:text-red-700 flex items-center text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              <button
                onClick={addInvite}
                className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Another Party
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Each party will receive a secure link to review the contract. 
              They can accept and sign, or provide feedback for revisions.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => router.push(`/contracts/${room.id}`)}
              className="text-gray-600 hover:text-gray-800"
            >
              Skip for Now
            </button>
            <button
              onClick={handleSendInvites}
              disabled={sending || !invites.some(i => i.email && i.name)}
              className="btn-primary flex items-center disabled:opacity-50"
            >
              {sending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitations
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}