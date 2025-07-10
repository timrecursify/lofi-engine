# Phase 2 Testing Guide - Authentication & Preferences

## Overview
This document outlines the testing procedures for Phase 2 implementation covering Clerk authentication with magic links, user preferences persistence, and pro-plan gating.

## Testing Environment Setup

### Prerequisites
```bash
# Ensure all dependencies are installed
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add Clerk keys and database configuration

# Start development server
pnpm dev
```

### Required Environment Variables
```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=... # D1 database connection
```

## Test Categories

### 1. Authentication Flow Testing

#### 1.1 Magic Link Sign-In Flow
**Test Case**: Complete magic link authentication
**Steps**:
1. Navigate to `/auth/signin`
2. Enter a valid email address
3. Click "Send Magic Link"
4. Verify:
   - Success message appears
   - Email is sent (check email)
   - User is redirected to check-email page
5. Click magic link in email
6. Verify:
   - User is redirected to `/auth/callback`
   - Loading state is shown
   - User is authenticated and redirected to home page
   - User state is properly set in `$authState` store

**Expected Result**: User successfully signs in and is redirected to the application

#### 1.2 Magic Link Validation
**Test Cases**:

**Expired Magic Link**:
1. Request magic link
2. Wait for expiration (or manually test with expired token)
3. Click expired link
4. Verify: Error page shows "Magic link expired" message

**Invalid Magic Link**:
1. Manually modify magic link URL
2. Click modified link
3. Verify: Error page shows "Invalid magic link" message

**Used Magic Link**:
1. Use valid magic link once
2. Try to use same link again
3. Verify: Error page shows appropriate message

#### 1.3 Authentication State Management
**Test Case**: Auth state persistence and reactivity
**Steps**:
1. Sign in successfully
2. Refresh page
3. Verify: User remains signed in
4. Open developer tools and check:
   - `$authState.isSignedIn` is `true`
   - `$authState.user` contains correct user data
   - `$user` store is populated with Clerk data

#### 1.4 Sign Out Flow
**Test Case**: Complete sign out process
**Steps**:
1. Sign in successfully
2. Trigger sign out (from profile menu or API call)
3. Verify:
   - User is redirected to signin page
   - `$authState.isSignedIn` becomes `false`
   - `$user` store resets to default values
   - Protected routes redirect to signin

### 2. User Preferences Testing

#### 2.1 Preferences Loading
**Test Case**: Preferences are loaded on authentication
**Steps**:
1. Sign in as new user
2. Verify: Default preferences are applied
3. Check console/network tab for API calls to `/api/user/preferences`
4. Verify: Preferences store is populated correctly

#### 2.2 Preferences Persistence
**Test Case**: Preferences sync with server
**Steps**:
1. Sign in successfully
2. Modify preferences (volume, theme, topics, etc.)
3. Verify:
   - Changes are reflected in UI immediately
   - Network request to POST `/api/user/preferences` is made
   - localStorage is updated as fallback
4. Refresh page
5. Verify: Modified preferences persist

#### 2.3 Offline Preferences
**Test Case**: Preferences work offline
**Steps**:
1. Sign in and modify preferences while online
2. Simulate offline mode (disable network or use dev tools)
3. Modify preferences
4. Verify:
   - Changes are saved to localStorage
   - UI updates immediately
   - No network errors are shown
5. Go back online
6. Verify: Preferences are synced to server

#### 2.4 Preferences API Testing
**Test Cases**:

**GET /api/user/preferences**:
```bash
# Test authenticated request
curl -H "Authorization: Bearer <session-token>" \
     http://localhost:5173/api/user/preferences

# Test unauthenticated request (should return 401)
curl http://localhost:5173/api/user/preferences
```

**POST /api/user/preferences**:
```bash
# Test valid preferences update
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <session-token>" \
     -d '{"preferences": {"theme": "dark", "volumes": {"music": 0.8}}}' \
     http://localhost:5173/api/user/preferences

# Test invalid data (should return 400)
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <session-token>" \
     -d '{"invalid": "data"}' \
     http://localhost:5173/api/user/preferences
```

### 3. Pro-Plan Gating Testing

#### 3.1 Topic Restrictions
**Test Case**: Pro topics are properly gated
**Steps**:
1. Sign in as free user
2. Navigate to topic selection
3. Verify:
   - Pro topics show lock icon
   - Pro badge is displayed
   - Clicking pro topic shows upgrade prompt
4. Set user to pro plan (via Clerk admin or metadata)
5. Refresh page
6. Verify:
   - Pro topics are unlocked
   - No lock icons on pro topics
   - Pro topics can be enabled/disabled

#### 3.2 ProGate Component Testing
**Test Case**: ProGate component functionality
**Steps**:
1. Wrap any component with `<ProGate>`
2. As free user, verify:
   - Content is visually restricted (grayed out)
   - Lock overlay appears
   - Pro badge is shown
   - Clicking shows upgrade modal
3. As pro user, verify:
   - Content is fully accessible
   - No restrictions or overlays
   - Normal functionality works

#### 3.3 Route Protection Testing
**Test Case**: RouteGuard component with pro requirements
**Steps**:
1. Create a test route with `<RouteGuard requireProPlan={true}>`
2. As free user, verify:
   - Access is denied
   - Redirected to upgrade page
   - Error message is shown
3. As pro user, verify:
   - Access is granted
   - Component renders normally

### 4. Error Handling Testing

#### 4.1 Network Error Handling
**Test Cases**:

**Offline Mode**:
1. Disable network connection
2. Try to sign in
3. Verify: Appropriate offline message is shown

**API Timeouts**:
1. Simulate slow network (dev tools throttling)
2. Attempt preferences sync
3. Verify: Timeout handling and retry logic work

**Server Errors**:
1. Mock 500 server error
2. Try API operations
3. Verify: User-friendly error messages are shown

#### 4.2 Authentication Error Handling
**Test Cases**:

**Invalid Session**:
1. Manually invalidate session token
2. Try to access protected resource
3. Verify: Redirected to signin with appropriate error

**Clerk Service Down**:
1. Mock Clerk service unavailability
2. Try to sign in
3. Verify: Graceful error handling and user messaging

### 5. Security Testing

#### 5.1 Route Protection
**Test Case**: Protected routes require authentication
**Steps**:
1. Sign out or use incognito mode
2. Try to access protected URLs directly:
   - `/dashboard`
   - `/preferences`
   - `/admin`
3. Verify: Redirected to signin page with return URL

#### 5.2 API Endpoint Security
**Test Cases**:
```bash
# Test API without authentication
curl http://localhost:5173/api/user/preferences
# Expected: 401 Unauthorized

# Test API with invalid token
curl -H "Authorization: Bearer invalid-token" \
     http://localhost:5173/api/user/preferences
# Expected: 401 Unauthorized

# Test API with expired token
curl -H "Authorization: Bearer <expired-token>" \
     http://localhost:5173/api/user/preferences
# Expected: 401 Unauthorized
```

### 6. Database Testing

#### 6.1 D1 Schema Validation
**Test Case**: Database schema is properly created
**Steps**:
```bash
# Check if tables exist
wrangler d1 execute lofi-radio-dev --command="SELECT name FROM sqlite_master WHERE type='table';"

# Verify user_preferences table structure
wrangler d1 execute lofi-radio-dev --command="PRAGMA table_info(user_preferences);"

# Test basic queries
wrangler d1 execute lofi-radio-dev --command="SELECT COUNT(*) FROM users;"
```

#### 6.2 Data Persistence
**Test Case**: User data is correctly stored and retrieved
**Steps**:
1. Sign in and modify preferences
2. Query database directly:
```bash
wrangler d1 execute lofi-radio-dev --command="SELECT * FROM user_preferences WHERE user_id='<user-id>';"
```
3. Verify: Data matches what was set in UI

### 7. Performance Testing

#### 7.1 Authentication Performance
**Test Case**: Auth operations complete within acceptable time
**Metrics**:
- Magic link generation: < 2 seconds
- Magic link validation: < 3 seconds
- Initial auth state load: < 1 second
- Preferences sync: < 2 seconds

#### 7.2 Preferences Sync Performance
**Test Case**: Preferences sync is debounced properly
**Steps**:
1. Rapidly change multiple preferences
2. Monitor network tab
3. Verify: Only one API call is made after debounce period (1 second)

## Testing Checklist

### Pre-Deployment Checklist
- [ ] All authentication flows work correctly
- [ ] Magic links are sent and validated properly
- [ ] User preferences persist across sessions
- [ ] Pro-plan gating restricts appropriate features
- [ ] Error handling works for all scenarios
- [ ] Database schema is created and functional
- [ ] API endpoints are secured and working
- [ ] Route protection is enforced
- [ ] Performance meets requirements
- [ ] No console errors in normal operation

### Post-Deployment Checklist
- [ ] Production magic links work with real email service
- [ ] D1 database is properly configured
- [ ] Clerk production keys are working
- [ ] All environment variables are set
- [ ] HTTPS is working for magic links
- [ ] Error tracking is capturing issues
- [ ] Performance monitoring is active

## Known Issues & Limitations

### Current Limitations
1. **TypeScript Errors**: Some platform.env.DB access may have TypeScript issues
2. **Magic Link Testing**: Requires real email service for full testing
3. **D1 Local Testing**: Local D1 may behave differently than production

### Future Improvements
1. **Unit Tests**: Add comprehensive unit tests with Vitest
2. **E2E Tests**: Implement Playwright end-to-end tests
3. **Load Testing**: Add load testing for authentication endpoints
4. **Monitoring**: Implement comprehensive error tracking and performance monitoring

## Debugging Tips

### Common Issues

**Authentication Not Working**:
1. Check Clerk keys in environment variables
2. Verify callback URLs are configured correctly
3. Check browser console for Clerk initialization errors

**Preferences Not Syncing**:
1. Check network tab for API call failures
2. Verify D1 database connection
3. Check authentication state and user ID

**Pro Gating Not Working**:
1. Verify user metadata has correct plan value
2. Check Clerk user object structure
3. Ensure isProUser() function is working correctly

### Debug Commands
```bash
# Check Clerk configuration
console.log(window.Clerk?.user)

# Check auth state
console.log($authState)

# Check preferences
console.log($preferences)

# Check user store
console.log($user)
```

## Success Criteria

Phase 2 is considered complete when:
1. ✅ Users can sign in using magic links
2. ✅ User preferences are persisted to D1 database
3. ✅ Pro features are properly gated based on user plan
4. ✅ Comprehensive error handling is in place
5. ✅ All security measures are enforced
6. ✅ Performance meets acceptable standards
7. ✅ No critical bugs in core functionality 