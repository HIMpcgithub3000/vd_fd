/**
 * Auth shim. Clerk is currently DISABLED — every request is treated as a
 * single demo user.
 *
 * To re-enable Clerk later:
 *   1. Set ``AUTH_PROVIDER=clerk`` in `.env.local`
 *   2. Re-add `<ClerkProvider>` in `app/layout.tsx`
 *   3. Switch `middleware.ts` back to `clerkMiddleware`
 *   4. Restore `<SignedIn> / <SignedOut> / <UserButton>` etc. in pages.
 *
 * For now, all API routes import `auth` from this file instead of
 * `@clerk/nextjs/server`.
 */

const DEMO_USER_ID = 'demo-user-vfd-advisor';

export async function auth(): Promise<{ userId: string }> {
  return { userId: DEMO_USER_ID };
}

export const isAuthEnabled = false;
