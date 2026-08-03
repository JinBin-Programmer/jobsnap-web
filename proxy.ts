import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Protected areas require auth.
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged-in users shouldn't see login/signup.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Forward the already-verified user id to the page render via a request
  // header, so requireProfile() (lib/auth.ts) can skip a second, redundant
  // getUser() network round-trip on every protected page/action. Headers
  // must be set on the request (not the response) to reach the render —
  // rebuild the response afterward, carrying over any cookies the Supabase
  // client just refreshed above.
  if (user) {
    request.headers.set("x-user-id", user.id);
    const withHeader = NextResponse.next({ request });
    supabaseResponse.cookies.getAll().forEach((c) => withHeader.cookies.set(c));
    supabaseResponse = withHeader;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/signup"],
};
