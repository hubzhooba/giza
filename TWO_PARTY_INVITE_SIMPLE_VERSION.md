# Two-Party Invite System - Simple Version (No Web3/Crypto)

## 📝 What to Tell Claude for Non-Web3 Implementation

When asking Claude to implement this invite system in a regular web application (no blockchain, no public keys), use this prompt:

---

### **Sample Prompt for Claude:**

"I want to implement a two-party room/collaboration system where:
1. One user creates a private room and gets a 6-character invite code
2. They share this code with exactly one other person
3. The second person joins using the code
4. The room is then locked to just these 2 users
5. Both users can collaborate in this private space

I DON'T need:
- Blockchain/Web3 features
- Public key encryption
- Cryptocurrency wallets
- Complex encryption (just use standard database security)

I DO need:
- Simple 6-character alphanumeric invite codes
- Shareable links
- Database to track rooms and participants
- Limit of exactly 2 users per room
- Basic authentication (email/password or OAuth)

Please provide the implementation using [YOUR TECH STACK: e.g., Next.js, PostgreSQL, Prisma]"

---

## 🔧 Simplified Implementation (No Crypto)

### 1. **Simplified Database Schema**

```sql
-- Users table (standard authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  password_hash TEXT, -- Or use OAuth instead
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table (no encryption keys needed)
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  invite_code TEXT UNIQUE NOT NULL,
  invite_link TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Room participants (simplified)
CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('creator', 'participant')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
```

### 2. **Simple Room Creation (No Encryption)**

```javascript
// No encryption needed - just generate code and save
async function createRoom(userId, roomName, description) {
  // Generate 6-character code
  const inviteCode = generateInviteCode();
  const inviteLink = `${process.env.APP_URL}/join/${inviteCode}`;
  
  // Create room in database
  const room = await db.rooms.create({
    data: {
      name: roomName,
      description: description,
      created_by: userId,
      invite_code: inviteCode,
      invite_link: inviteLink,
      is_locked: false
    }
  });
  
  // Add creator as first participant
  await db.room_participants.create({
    data: {
      room_id: room.id,
      user_id: userId,
      role: 'creator'
    }
  });
  
  return { room, inviteCode, inviteLink };
}

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

### 3. **Simple Join Process**

```javascript
async function joinRoomWithCode(inviteCode, userId) {
  // Find room by invite code
  const room = await db.rooms.findUnique({
    where: { invite_code: inviteCode },
    include: { room_participants: true }
  });
  
  if (!room) {
    throw new Error('Invalid invite code');
  }
  
  // Check if room is full (2 participants max)
  if (room.room_participants.length >= 2) {
    throw new Error('Room is full');
  }
  
  // Check if user already joined
  const alreadyJoined = room.room_participants.some(
    p => p.user_id === userId
  );
  
  if (alreadyJoined) {
    return { room, alreadyMember: true };
  }
  
  // Add user as participant
  await db.room_participants.create({
    data: {
      room_id: room.id,
      user_id: userId,
      role: 'participant'
    }
  });
  
  // Lock room since we now have 2 participants
  await db.rooms.update({
    where: { id: room.id },
    data: { is_locked: true }
  });
  
  return { room, alreadyMember: false };
}
```

### 4. **Simple Authentication Check**

```javascript
// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first' });
  }
  next();
}

// Check if user can access room
async function canAccessRoom(userId, roomId) {
  const participant = await db.room_participants.findFirst({
    where: {
      room_id: roomId,
      user_id: userId
    }
  });
  
  return !!participant;
}
```

### 5. **Simple React Components**

```jsx
// Create Room Component
function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const handleCreate = async () => {
    const response = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: roomName })
    });
    
    const data = await response.json();
    setInviteCode(data.inviteCode);
  };
  
  return (
    <div>
      <input 
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Room name"
      />
      <button onClick={handleCreate}>Create Room</button>
      
      {inviteCode && (
        <div>
          <h3>Share this code:</h3>
          <div className="invite-code">{inviteCode}</div>
          <button onClick={() => navigator.clipboard.writeText(inviteCode)}>
            Copy Code
          </button>
        </div>
      )}
    </div>
  );
}

// Join Room Component
function JoinRoom() {
  const [code, setCode] = useState('');
  const router = useRouter();
  
  const handleJoin = async () => {
    const response = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: code.toUpperCase() })
    });
    
    if (response.ok) {
      const data = await response.json();
      router.push(`/rooms/${data.roomId}`);
    }
  };
  
  return (
    <div>
      <input 
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter 6-character code"
        maxLength={6}
      />
      <button onClick={handleJoin} disabled={code.length !== 6}>
        Join Room
      </button>
    </div>
  );
}
```

## 🎯 Key Differences from Web3 Version

| Feature | Web3 Version | Simple Version |
|---------|--------------|----------------|
| Authentication | Wallet connection | Email/password or OAuth |
| Encryption | Public key encryption | HTTPS + database security |
| User ID | Wallet address | UUID or auto-increment ID |
| Signatures | Cryptographic signatures | Session tokens |
| Storage | Blockchain + IPFS | Regular database |
| Cost | Gas fees | Free (server costs only) |

## 📋 What to Emphasize to Claude

When asking Claude to implement this for a non-Web3 app, emphasize:

1. **"I want a simple invite system, no blockchain needed"**
2. **"Use regular authentication (email/password or social login)"**
3. **"Store everything in a regular database (PostgreSQL/MySQL/MongoDB)"**
4. **"No cryptocurrency or wallet features needed"**
5. **"Just need to limit rooms to exactly 2 users"**
6. **"Use standard web security (HTTPS, sessions, CSRF tokens)"**

## 🚀 Quick Start Template

Tell Claude:

"Create a two-party collaboration system with:
- Regular user authentication (not crypto wallets)
- 6-character invite codes for sharing
- PostgreSQL/MySQL database
- Express/Next.js API routes
- React frontend
- Exactly 2 users per room limit
- No blockchain or Web3 features

Focus on simplicity and user experience."

## 🔒 Security Without Crypto

Instead of public key encryption, use:
- **HTTPS** for transport security
- **Session management** for authentication
- **CSRF tokens** for form security
- **Rate limiting** for API endpoints
- **Input validation** for invite codes
- **SQL injection prevention** (parameterized queries)
- **XSS prevention** (sanitize outputs)

This gives you the same two-party room functionality without any Web3 complexity!