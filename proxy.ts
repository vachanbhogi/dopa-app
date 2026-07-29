import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export function requiresSessionRefresh(pathname: string) {
  return !(
    pathname === "/demo" ||
    pathname.startsWith("/demo/") ||
    pathname === "/fc-proof" ||
    pathname.startsWith("/api/fc-demo/")
  );
}

export async function proxy(request: NextRequest) {
  return requiresSessionRefresh(request.nextUrl.pathname)
    ? await updateSession(request)
    : NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
