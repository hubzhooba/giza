# Two-Party Room Invite System - Complete Implementation Guide

## 🎯 Overview
This system allows two users to share an encrypted room (tent) for secure document collaboration. One user creates the room and shares an invite code/link with the other user, who can then join using that code.

## 🏗️ Architecture Components

### 1. Database Schema
The system uses three main tables:

```sql
-- Rooms table stores the encrypted collaboration spaces
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  encryption_key TEXT NOT NULL,  -- Encrypted with creator's public key
  invite_code TEXT UNIQUE,        -- 6-character shareable code
  invite_link TEXT,               -- Full shareable link
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Room participants tracks who has access
CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('creator', 'participant')),
  encryption_key TEXT,  -- Room key encrypted with participant's public key
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Profiles stores user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  public_key TEXT,  -- For encryption
  wallet_address TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔑 Core Implementation

### 2. Invite Code Generation (`/client/src/pages/tents/new.tsx`)

```typescript
// Generate a unique 6-character invite code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create room with invite code
const createRoom = async () => {
  const inviteCode = generateInviteCode();
  const inviteLink = `${window.location.origin}/tents/join?code=${inviteCode}`;
  
  // Generate encryption key for the room
  const roomKey = await generateEncryptionKey();
  
  // Encrypt room key with creator's public key
  const encryptedKey = await encryptWithPublicKey(roomKey, creatorPublicKey);
  
  // Save to database
  const { data: room } = await supabase
    .from('rooms')
    .insert({
      name: roomName,
      description: roomDescription,
      created_by: userId,
      encryption_key: encryptedKey,
      invite_code: inviteCode,
      invite_link: inviteLink,
      is_locked: false
    })
    .select()
    .single();
    
  // Add creator as participant
  await supabase
    .from('room_participants')
    .insert({
      room_id: room.id,
      user_id: userId,
      role: 'creator',
      encryption_key: encryptedKey
    });
    
  return { room, inviteCode, inviteLink };
};
```

### 3. Sharing Mechanism (`/client/src/pages/tents/[id].tsx`)

```typescript
// Component for displaying and sharing invite code
const ShareInvite = ({ inviteCode, inviteLink }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  
  const shareViaEmail = () => {
    const subject = 'Join my secure room';
    const body = `Join my secure room using this code: ${inviteCode}\n\nOr click this link: ${inviteLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };
  
  return (
    <div className="invite-share-container">
      {/* Display invite code in large, readable format */}
      <div className="invite-code-display">
        <h3>Invite Code</h3>
        <div className="code-box">
          {inviteCode.split('').map((char, i) => (
            <span key={i} className="code-char">{char}</span>
          ))}
        </div>
        <button onClick={() => copyToClipboard(inviteCode)}>
          Copy Code
        </button>
      </div>
      
      {/* Shareable link */}
      <div className="invite-link-display">
        <input 
          type="text" 
          value={inviteLink} 
          readOnly 
          onClick={(e) => e.target.select()}
        />
        <button onClick={() => copyToClipboard(inviteLink)}>
          Copy Link
        </button>
      </div>
      
      {/* Share options */}
      <div className="share-options">
        <button onClick={shareViaEmail}>Share via Email</button>
        <button onClick={() => shareViaWhatsApp(inviteLink)}>Share on WhatsApp</button>
      </div>
    </div>
  );
};
```

### 4. Join Flow - Processing Invite (`/client/src/hooks/useProcessInvite.ts`)

```typescript
export function useProcessInvite() {
  const router = useRouter();
  const { user } = useAuth();
  
  const processInviteCode = async (code: string) => {
    try {
      // 1. Validate code format
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        throw new Error('Invalid invite code format');
      }
      
      // 2. Look up room by invite code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*, room_participants(*)')
        .eq('invite_code', code)
        .single();
        
      if (roomError || !room) {
        throw new Error('Invalid or expired invite code');
      }
      
      // 3. Check if room is full (two-party limit)
      if (room.room_participants.length >= 2) {
        throw new Error('This room is already full');
      }
      
      // 4. Check if user is already a participant
      const existingParticipant = room.room_participants.find(
        p => p.user_id === user.id
      );
      
      if (existingParticipant) {
        // Already joined, redirect to room
        router.push(`/tents/${room.id}`);
        return;
      }
      
      // 5. Join the room
      await joinRoom(room.id, user.id);
      
      // 6. Redirect to room
      router.push(`/tents/${room.id}`);
      
    } catch (error) {
      console.error('Failed to process invite:', error);
      throw error;
    }
  };
  
  const joinRoom = async (roomId: string, userId: string) => {
    // Get user's public key for encryption
    const { data: profile } = await supabase
      .from('profiles')
      .select('public_key')
      .eq('id', userId)
      .single();
      
    if (!profile?.public_key) {
      throw new Error('User public key not found');
    }
    
    // Get the room's encryption key
    const { data: room } = await supabase
      .from('rooms')
      .select('encryption_key')
      .eq('id', roomId)
      .single();
    
    // Re-encrypt room key with joiner's public key
    const decryptedKey = await decryptWithPrivateKey(room.encryption_key);
    const reEncryptedKey = await encryptWithPublicKey(decryptedKey, profile.public_key);
    
    // Add as participant
    const { error } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: userId,
        role: 'participant',
        encryption_key: reEncryptedKey
      });
      
    if (error) throw error;
    
    // Lock room after second participant joins
    await supabase
      .from('rooms')
      .update({ is_locked: true })
      .eq('id', roomId);
      
    return true;
  };
  
  return { processInviteCode, joinRoom };
}
```

### 5. Join Page UI (`/client/src/pages/tents/join.tsx`)

```typescript
export default function JoinTent() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { processInviteCode } = useProcessInvite();
  const router = useRouter();
  
  // Auto-fill from URL if present
  useEffect(() => {
    const { code } = router.query;
    if (code && typeof code === 'string') {
      setInviteCode(code);
      // Auto-submit if from direct link
      handleJoin(code);
    }
  }, [router.query]);
  
  const handleJoin = async (code?: string) => {
    const codeToUse = code || inviteCode;
    
    if (!codeToUse) {
      toast.error('Please enter an invite code');
      return;
    }
    
    setLoading(true);
    try {
      await processInviteCode(codeToUse.toUpperCase());
      toast.success('Successfully joined room!');
    } catch (error) {
      toast.error(error.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="join-container">
      <h1>Join a Secure Room</h1>
      
      {/* Manual code entry */}
      <div className="code-input-container">
        <label>Enter Invite Code</label>
        <div className="code-input-grid">
          {[0, 1, 2, 3, 4, 5].map(index => (
            <input
              key={index}
              type="text"
              maxLength={1}
              value={inviteCode[index] || ''}
              onChange={(e) => handleCodeInput(e, index)}
              onKeyUp={(e) => handleKeyUp(e, index)}
              className="code-input-box"
              autoFocus={index === 0}
            />
          ))}
        </div>
      </div>
      
      <button 
        onClick={() => handleJoin()}
        disabled={loading || inviteCode.length !== 6}
      >
        {loading ? 'Joining...' : 'Join Room'}
      </button>
      
      {/* Alternative: paste full code */}
      <div className="paste-option">
        <input
          type="text"
          placeholder="Or paste invite code here"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 6))}
          onPaste={handlePaste}
        />
      </div>
    </div>
  );
}
```

### 6. Security & Validation

```typescript
// Server-side validation (using RLS policies in Supabase)
CREATE POLICY "Users can only see rooms they participate in"
ON rooms FOR SELECT
USING (
  id IN (
    SELECT room_id FROM room_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Only 2 participants per room"
ON room_participants FOR INSERT
WITH CHECK (
  (SELECT COUNT(*) FROM room_participants WHERE room_id = NEW.room_id) < 2
);

// Client-side validation
const validateInviteCode = (code: string): boolean => {
  // Must be exactly 6 characters
  if (code.length !== 6) return false;
  
  // Must be alphanumeric uppercase
  if (!/^[A-Z0-9]{6}$/.test(code)) return false;
  
  return true;
};

// Rate limiting for join attempts
const rateLimitJoinAttempts = async (userId: string) => {
  const attempts = await redis.incr(`join_attempts:${userId}`);
  await redis.expire(`join_attempts:${userId}`, 60); // 1 minute window
  
  if (attempts > 5) {
    throw new Error('Too many join attempts. Please try again later.');
  }
};
```

### 7. Real-time Updates

```typescript
// Subscribe to participant changes
useEffect(() => {
  const subscription = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        // New participant joined
        toast.success('A new participant has joined the room!');
        setParticipants(prev => [...prev, payload.new]);
        
        // Lock room if now full
        if (participants.length >= 2) {
          setRoomLocked(true);
        }
      }
    )
    .subscribe();
    
  return () => {
    subscription.unsubscribe();
  };
}, [roomId]);
```

## 🎨 UI/UX Best Practices

### Visual Feedback
```css
/* Make invite code easy to read */
.code-box {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
}

.code-char {
  font-size: 32px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  letter-spacing: 8px;
  color: #333;
}

/* Hover effect for copy */
.code-box:hover {
  background: #e0e0e0;
  cursor: pointer;
}

/* Success state */
.joined-indicator {
  color: green;
  animation: fadeIn 0.5s;
}
```

### User Experience Enhancements
1. **Auto-copy on click** - Single click copies code
2. **Visual confirmation** - Toast messages for all actions
3. **QR Code option** - Generate QR code for mobile sharing
4. **Expiry indication** - Show if invite has expired
5. **Participant count** - Show "1/2 participants"

## 🚀 Advanced Features

### QR Code Generation
```typescript
import QRCode from 'qrcode';

const generateQRCode = async (inviteLink: string) => {
  const qrDataUrl = await QRCode.toDataURL(inviteLink, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  return qrDataUrl;
};
```

### Invite Expiration
```typescript
// Add expiry to rooms table
ALTER TABLE rooms ADD COLUMN invite_expires_at TIMESTAMP;

// Check expiry during join
const checkInviteExpiry = (room: Room): boolean => {
  if (!room.invite_expires_at) return true;
  return new Date(room.invite_expires_at) > new Date();
};
```

### Email Notifications
```typescript
const sendInviteEmail = async (recipientEmail: string, inviteCode: string) => {
  await sendEmail({
    to: recipientEmail,
    subject: 'You\'ve been invited to a secure room',
    html: `
      <h2>Join Secure Room</h2>
      <p>You've been invited to join a secure collaboration room.</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center;">
        <h1 style="letter-spacing: 8px; font-family: monospace;">
          ${inviteCode}
        </h1>
      </div>
      <p>Or click here: <a href="${inviteLink}">Join Room</a></p>
    `
  });
};
```

## 📱 Mobile Optimization

```typescript
// Deep linking for mobile apps
const createDeepLink = (inviteCode: string) => {
  const universalLink = `https://yourapp.com/join/${inviteCode}`;
  const appScheme = `yourapp://join/${inviteCode}`;
  
  return {
    universal: universalLink,
    appScheme: appScheme,
    fallback: `${window.location.origin}/tents/join?code=${inviteCode}`
  };
};

// Handle mobile share
const shareOnMobile = async (inviteCode: string) => {
  if (navigator.share) {
    await navigator.share({
      title: 'Join my secure room',
      text: `Join with code: ${inviteCode}`,
      url: inviteLink
    });
  }
};
```

## 🔒 Security Considerations

1. **Rate Limiting** - Prevent brute force attempts
2. **Code Uniqueness** - Ensure no duplicate codes
3. **Encryption** - All room data is encrypted
4. **Access Control** - Strict two-party limit
5. **Audit Trail** - Log all join attempts
6. **Expiration** - Optional time-limited invites

## 📋 Complete Implementation Checklist

- [x] Database schema for rooms and participants
- [x] Invite code generation (6-character alphanumeric)
- [x] Create room with invite code
- [x] Share mechanisms (copy, email, QR)
- [x] Join page with code input
- [x] Process invite and validate
- [x] Two-party limit enforcement
- [x] Encryption key management
- [x] Real-time updates on join
- [x] Mobile-friendly UI
- [x] Error handling and validation
- [x] Security policies

## 🎯 Key Takeaways

1. **Simple Code Format** - 6 characters is easy to share verbally
2. **Multiple Share Options** - Link, code, QR, email
3. **Strict Access Control** - Exactly 2 participants
4. **Encrypted by Default** - All room data is encrypted
5. **Real-time Updates** - Instant notification when partner joins
6. **Mobile-First** - Works great on all devices

This system provides a secure, user-friendly way for two parties to establish a private collaboration space with minimal friction.