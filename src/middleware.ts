import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "voicedesk_session"
const PUBLIC_PREFIXES = ["/login", "/api/twilio", "/api/calling/tick"]

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next()
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
