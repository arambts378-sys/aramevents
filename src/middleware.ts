import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/organizer/register'
  const isVerifyRoute = request.nextUrl.pathname === '/organizer/verify'
  const isAdminLogin = request.nextUrl.pathname === '/super-admin/login'
  const isSuperAdminRoute =
    request.nextUrl.pathname.startsWith('/super-admin') && !isAdminLogin
  const isAppProtectedRoute =
    request.nextUrl.pathname.startsWith('/app') ||
    request.nextUrl.pathname.startsWith('/check-in')

  // Unauthenticated user attempting to access protected admin route
  if (isSuperAdminRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/super-admin/login'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // Unauthenticated user attempting to access protected organizer route
  if (isAppProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // Authenticated but unverified user attempting to access protected route
  if ((isSuperAdminRoute || isAppProtectedRoute) && user && !user.email_confirmed_at) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/organizer/verify'
    if (user.email) {
      redirectUrl.searchParams.set('email', user.email)
    }
    return NextResponse.redirect(redirectUrl)
  }

  // Confirmed user visiting standard auth / register / verify routes
  if ((isAuthRoute || isVerifyRoute) && user && user.email_confirmed_at) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/app'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
