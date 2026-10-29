import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/features/auth/demo-mode";
import { MOCK_DESK_COOKIE, MOCK_USER_COOKIE } from "@/features/auth/session";

// Redirects logged-out users to /login. Real permission checks go in features/auth.
export async function proxy(request: NextRequest) {
  // Local testing only: skip the login check until /login works.
  // Ignored outside `next dev`, so it can never open up a deployed app.
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true") {
    return NextResponse.next({ request });
  }

  // Demo login (features/auth/actions.ts): its cookie lets the person in.
  // A climber's cookie opens /me, the "desk" login's cookie opens /desk.
  // TODO(auth): remove once Supabase sign-in exists.
  if (isDemoMode()) {
    const needed = request.nextUrl.pathname.startsWith("/desk")
      ? MOCK_DESK_COOKIE
      : MOCK_USER_COOKIE;
    if (request.cookies.has(needed)) return NextResponse.next({ request });
    // A climber's demo session on the desk: say the desk is for staff (#87),
    // rather than sending a signed-in person to log in.
    if (needed === MOCK_DESK_COOKIE && request.cookies.has(MOCK_USER_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/staff-only";
      return NextResponse.redirect(url);
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/desk/:path*", "/me/:path*"],
};
