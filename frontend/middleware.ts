import { NextRequest, NextResponse } from "next/server";

const BOTS = [
  "WhatsApp",
  "facebookexternalhit",
  "Twitterbot",
  "LinkedInBot",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Googlebot",
  "Bingbot",
  "Applebot",
  "iframely",
  "vkShare",
  "W3C_Validator",
];

const BACKEND =
  process.env.BACKEND_URL ?? "https://gema-project.onrender.com";

const routes: [RegExp, string][] = [
  [/^\/events\/(.+)/, "event"],
  [/^\/teaching-event\/(.+)/, "event"],
  [/^\/blog\/(.+)/, "blog"],
  [/^\/vendors\/(.+)/, "vendor"],
  [/^\/teachers\/(.+)/, "teacher"],
  [/^\/instructors\/(.+)/, "teacher"],
  [/^\/categories\/(.+)/, "category"],
  [/^\/collections\/(.+)/, "collection"],
];

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!BOTS.some((b) => ua.includes(b))) return NextResponse.next();

  const { pathname } = request.nextUrl;

  for (const [re, type] of routes) {
    const m = pathname.match(re);
    if (m) {
      return NextResponse.rewrite(`${BACKEND}/og/${type}/${m[1]}`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/events/:path*",
    "/teaching-event/:path*",
    "/blog/:path*",
    "/vendors/:path*",
    "/teachers/:path*",
    "/instructors/:path*",
    "/categories/:path*",
    "/collections/:path*",
  ],
};
