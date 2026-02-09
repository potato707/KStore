import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const response = NextResponse.next();

  // Get auth from localStorage cookie (if exists)
  const authCookie = req.cookies.get('kstore_auth');

  const isProtectedRoute = req.nextUrl.pathname === '/';
  const isAuthRoute = req.nextUrl.pathname === '/login';

  // For protected routes, check if user is authenticated
  if (isProtectedRoute && !authCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If already authenticated and trying to access login, redirect to home
  if (isAuthRoute && authCookie) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
