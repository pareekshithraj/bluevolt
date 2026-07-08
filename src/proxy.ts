import { NextRequest, NextResponse } from "next/server";
import { getEmployeeSessionCookieName, readEmployeeSessionToken, createEmployeeSessionToken } from "@/lib/employee/session";

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, icon.png (browser icons)
         * - public assets
         */
        "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|Assets/).*)",
    ],
};

export async function proxy(request: NextRequest) {
    const url = request.nextUrl.clone();
    const hostname = request.headers.get("host") || "";

    // Extract subdomain: e.g. "lifeos.bluevolt.group" -> "lifeos"
    // Handle both production and local development
    const productionDomains = ["bluevolt.group", "bluevolt.in"];
    const localDomain = "localhost:3000";

    let subdomain: string | null = null;

    for (const domain of productionDomains) {
        if (hostname.endsWith(`.${domain}`)) {
            subdomain = hostname.replace(`.${domain}`, "");
            break;
        }
    }

    if (!subdomain && hostname.endsWith(`.${localDomain}`)) {
        subdomain = hostname.replace(`.${localDomain}`, "");
    }

    // Route lifeos subdomain to locally hosted static app in /public/lifeos
    if (subdomain === "lifeos") {
        if (url.pathname.startsWith("/lifeos/")) {
            return NextResponse.rewrite(url);
        }

        if (url.pathname === "/") {
            url.pathname = "/lifeos/index.html";
            return NextResponse.rewrite(url);
        }

        if (url.pathname.startsWith("/assets/") || url.pathname === "/favicon.ico") {
            url.pathname = `/lifeos${url.pathname}`;
            return NextResponse.rewrite(url);
        }

        // SPA fallback
        url.pathname = "/lifeos/index.html";
        return NextResponse.rewrite(url);
    }

    // Route vmart/vemgalmart subdomain to locally hosted static app in /public/vmart
    if (subdomain === "vmart" || subdomain === "vemgalmart") {
        if (url.pathname.startsWith("/vmart/")) {
            return NextResponse.rewrite(url);
        }

        if (url.pathname === "/") {
            url.pathname = "/vmart/index.html";
            return NextResponse.rewrite(url);
        }

        const vmartRootFiles = new Set([
            "/vite.svg",
            "/manifest.webmanifest",
            "/sw.js",
            "/firebase-messaging-sw.js",
        ]);

        if (
            url.pathname.startsWith("/assets/") ||
            vmartRootFiles.has(url.pathname) ||
            /^\/workbox-[^/]+\.js$/.test(url.pathname)
        ) {
            url.pathname = `/vmart${url.pathname}`;
            return NextResponse.rewrite(url);
        }

        // SPA fallback
        url.pathname = "/vmart/index.html";
        return NextResponse.rewrite(url);
    }


    if (url.pathname.startsWith("/employee")) {
        const token = request.cookies.get(getEmployeeSessionCookieName())?.value;
        const session = await readEmployeeSessionToken(token);
        const isLoginPage = url.pathname === "/employee/login";
        const isProtectedEmployeeRoute = url.pathname.startsWith("/employee/portal");

        if (isLoginPage && session) {
            return NextResponse.redirect(new URL("/employee/portal", request.url));
        }

        if (isProtectedEmployeeRoute && !session) {
            return NextResponse.redirect(new URL("/employee/login", request.url));
        }

        // Silent session refresh if active in portal and session is expiring soon
        if (session && !isLoginPage) {
            const timeRemaining = session.expiresAt - Date.now();
            const REFRESH_THRESHOLD_MS = 1000 * 60 * 30; // 30 minutes
            if (timeRemaining > 0 && timeRemaining < REFRESH_THRESHOLD_MS) {
                const response = NextResponse.next();
                const newToken = await createEmployeeSessionToken({
                    userId: session.userId,
                    email: session.email,
                    name: session.name,
                    role: session.role,
                });
                response.cookies.set(getEmployeeSessionCookieName(), newToken, {
                    httpOnly: true,
                    sameSite: "strict",
                    secure: process.env.NODE_ENV === "production",
                    path: "/",
                    maxAge: 60 * 60 * 2, // 2 hours
                });
                return response;
            }
        }
    }

    return NextResponse.next();
}
