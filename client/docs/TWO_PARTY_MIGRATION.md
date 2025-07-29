# Two-Party Contract System Migration Guide

## Overview
This migration simplifies the contract system to support exactly two parties per contract room, eliminating the complex sharing system that was causing infinite recursion errors.

## Database Changes

### 1. Apply the New Schema
Run the SQL script in `/client/src/lib/two-party-schema.sql` in your Supabase SQL Editor:

```sql
-- This will:
-- 1. Drop old tables (participants, shared_contracts)
-- 2. Create new simplified rooms table
-- 3. Add invitee_id field to rooms
-- 4. Create simple RLS policies
```

### 2. Key Changes
- **rooms** table now has `invitee_id` field
- No more `shared_contracts` table
- No more `participants` table (using direct fields instead)
- Simple RLS: `creator_id = auth.uid() OR invitee_id = auth.uid()`

## How It Works

### Creating a Contract
1. User A creates a contract room
2. Room is created with:
   - `creator_id` = User A's ID
   - `invitee_id` = NULL
   - `status` = 'pending'

### Sharing a Contract
1. User A generates invite link with room hash
2. User B clicks link and authenticates
3. System calls `join_room()` function
4. Room is updated with:
   - `invitee_id` = User B's ID
   - `status` = 'active'

### Access Control
- Both users can now see the room in their dashboards
- Both users can view/edit documents in the room
- Real-time updates work for both parties

## Benefits
1. **No Recursion** - Simple direct field checks
2. **Better Performance** - No complex joins
3. **Clear Logic** - Easy to understand two-party system
4. **Natural Limitation** - Enforces two-party contracts

## Testing
1. Create a new contract as User A
2. Share the invite link
3. Sign in as User B and click the link
4. Verify both users see the contract
5. Test real-time updates between users