import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createRecordingFetch } from '@/lib/monitoring/dbCallRecorder'
import { classifySurface } from '@/lib/monitoring/surfaces'
import { REDIRECT_HOSTS, SITE_URL } from '@/lib/site'

export async function middleware(request: NextRequest) {
  // One canonical host for SEO and auth cookies: www.aram.events -> aram.events.
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  if (REDIRECT_HOSTS.includes(host)) {
    const canonical = new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL);
    return NextResponse.redirect(canonical, 308);
  }

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
      global: { fetch: createRecordingFetch(() => classifySurface(request.nextUrl.pathname)) },
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

  // Unfinished (unconfirmed) account attempting to access protected route: registering
  // again with the same email completes it.
  if ((isSuperAdminRoute || isAppProtectedRoute) && user && !user.email_confirmed_at) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/organizer/register'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  // Confirmed user visiting standard auth / register routes
  if (isAuthRoute && user && user.email_confirmed_at) {
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
