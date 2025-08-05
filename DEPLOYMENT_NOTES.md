# Deployment Notes - Wallet User Support

## What We Fixed

1. **Database Schema Issues**
   - Changed `creator_id` and `invitee_id` from UUID to TEXT to support wallet addresses
   - Fixed `external_id` default value that was causing UUID/TEXT mismatch
   - Updated all related constraints and indexes

2. **Trigger Issues**
   - Fixed `handle_new_room()` trigger that was comparing UUID profiles.id with TEXT creator_id
   - Created functions that temporarily disable triggers during insert to avoid comparison errors

3. **RPC Functions**
   - Created `simple_create_room` that uses JSONB to avoid type issues
   - Updated to disable triggers during room creation
   - All functions now support both UUID and wallet address users

## Current Status

✅ **Working:**
- Wallet users can connect with ArConnect
- Wallet users can create tents (rooms)
- Database properly stores wallet addresses
- No more UUID = TEXT errors

⚠️ **To Verify:**
- Tent sharing between wallet users
- Document upload/download in tents
- Joining tents with wallet addresses

## Deployment Steps

1. **Deploy to Vercel** to get the latest code live
2. **Test the flow:**
   - Connect with ArConnect wallet
   - Create a tent
   - Copy the tent ID
   - Share with another wallet user
   - Have them join the tent
   - Upload a document
   - Both users should see the document

## SQL Scripts Run

1. `fix-external-id-type.sql` - Changed external_id to TEXT
2. `fix-external-id-default.sql` - Fixed default value
3. `create-simple-insert.sql` - Created JSONB-based functions
4. `fix-trigger-function.sql` - Fixed the trigger
5. `final-working-function.sql` - Final working solution

## Known Issues

- ArConnect shows deprecation warning for signature API (this is just a warning, functionality works)
- Need to verify multi-user tent functionality

## Next Steps

1. Deploy to Vercel
2. Test full tent creation → sharing → joining flow
3. Test document upload/download
4. Monitor for any new errors