import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Check if there's an authentication error in the URL
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // If we have an authentication_expired error, redirect to a clean URL
  // This prevents the browser from getting stuck in a redirect loop
  if (error === 'temporarily_unavailable' && errorDescription === 'authentication_expired') {
    console.log('Proxy: Detected expired authentication, redirecting to clean URL');

    // Redirect to the base URL without any query parameters
    const url = new URL(request.url);
    url.search = ''; // Clear all query parameters

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which routes the proxy should run on
export const config = {
  matcher: '/:path*', // Run on all routes
};
