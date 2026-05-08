import { NextResponse } from 'next/server';

/**
 * Auth disabled — pass everything through.
 * Restore Clerk by reverting this file to use `clerkMiddleware`.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
