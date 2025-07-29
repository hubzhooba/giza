import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { DatabaseService } from '@/lib/database';
import toast from 'react-hot-toast';

export function useProcessInvite() {
  const router = useRouter();
  const { user } = useStore();

  useEffect(() => {
    if (!user || !router.isReady) return;

    const processInvite = async () => {
      // Check if we have a redirect query parameter from login
      const { redirect } = router.query;
      if (!redirect || typeof redirect !== 'string') return;

      const redirectUrl = decodeURIComponent(redirect);
      
      // Only process if it's a contract review or sign URL
      if (!redirectUrl.includes('/contracts/review/') && !redirectUrl.includes('/sign/')) {
        return;
      }
      
      // Extract token from the redirect URL
      let token: string | null = null;
      
      if (redirectUrl.includes('/contracts/review/')) {
        token = redirectUrl.split('/contracts/review/')[1];
      } else if (redirectUrl.includes('/sign/')) {
        token = redirectUrl.split('/sign/')[1];
      }

      if (!token) return;

      try {
        // Decode the token to get contract ID
        const decoded = JSON.parse(atob(token));
        const contractId = decoded.contractId;

        if (!contractId) return;

        // Join the room as the invitee (second party)
        await DatabaseService.joinRoom(contractId, user.id);
        
        toast.success('You have joined the contract room');
        
        // Clear the redirect query and navigate to the intended page
        router.push(redirectUrl);
      } catch (error) {
        console.error('Error processing invite:', error);
        // If processing fails, still redirect to the intended page
        router.push(redirectUrl);
      }
    };

    processInvite();
  }, [user, router]);
}