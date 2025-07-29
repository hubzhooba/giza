# Session Persistence Implementation

## Overview
The application now properly maintains user sessions across page reloads using Supabase's built-in session management with additional private key persistence.

## Key Components

### 1. Auth State Listener (`/client/src/hooks/useAuthStateListener.ts`)
- Checks for existing Supabase session on mount
- Listens for auth state changes (sign in/out)
- Automatically loads user profile when session exists
- Restores private key from localStorage

### 2. Private Key Storage
- Private keys are stored in localStorage with user-specific keys: `pk_${userId}`
- Keys are stored on login/signup
- Keys are cleared on logout
- Keys are restored when session is recovered

### 3. Session Flow

#### On Page Load:
1. `AppWrapper` component runs `useAuthStateListener`
2. Checks `supabase.auth.getSession()` for existing session
3. If session exists:
   - Loads user profile from database
   - Restores private key from localStorage
   - Sets user state in Zustand store
4. If no session:
   - User remains logged out
   - Protected routes redirect to login

#### On Login/Signup:
1. User authenticates with Supabase
2. Profile is loaded/created
3. Private key is generated/derived
4. Private key is stored in localStorage
5. User state is set in Zustand store

#### On Logout:
1. Supabase session is cleared
2. Private key is removed from localStorage
3. User state is cleared
4. Redirected to login (if on protected page)

## Security Considerations

### Private Key Storage
- Private keys are stored in browser localStorage
- Keys are only accessible to the same origin
- Keys are tied to specific user IDs
- In production, consider encrypting keys with a user-derived password

### Session Security
- Sessions are managed by Supabase with secure httpOnly cookies
- Session tokens are automatically refreshed
- CSRF protection is built-in

## Protected Routes
Use the `ProtectedRoute` component to protect pages that require authentication:

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function SecurePage() {
  return (
    <ProtectedRoute>
      {/* Your protected content */}
    </ProtectedRoute>
  );
}
```

## Testing Session Persistence

1. Log in to the application
2. Refresh the page - you should remain logged in
3. Close and reopen the browser - you should remain logged in
4. Click logout - you should be signed out and redirected

## Notes
- Supabase sessions expire after 1 week by default (configurable)
- Private keys persist indefinitely in localStorage
- Consider implementing a "Remember me" feature for extended sessions