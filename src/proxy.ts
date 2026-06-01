import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, readSessionToken } from "@/lib/stores24/session";
import { getEmployeeSessionCookieName, readEmployeeSessionToken } from "@/lib/employee/session";

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
    const stores24External = "https://stores24.bluevolt.group";

    // Extract subdomain: e.g. "stores24.bluevolt.group" -> "stores24"
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
        // Local dev: stores24.localhost:3000
        subdomain = hostname.replace(`.${localDomain}`, "");
    }

    // If stores24 still points here, send traffic to separate deployment.
    if (subdomain === "stores24") {
        const redirectUrl = new URL(`${stores24External}${url.pathname}${url.search}`);
        return NextResponse.redirect(redirectUrl, 308);
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

    if (url.pathname.startsWith("/stores24")) {
        const session = await readSessionToken(request.cookies.get(getSessionCookieName())?.value);
        const isLoginPage = url.pathname === "/stores24/login";
        const isProtectedStores24Route =
            url.pathname.startsWith("/stores24/dashboard") ||
            url.pathname.startsWith("/stores24/products") ||
            url.pathname.startsWith("/stores24/inventory") ||
            url.pathname.startsWith("/stores24/sales") ||
            url.pathname.startsWith("/stores24/purchases") ||
            url.pathname.startsWith("/stores24/suppliers") ||
            url.pathname.startsWith("/stores24/staff") ||
            url.pathname.startsWith("/stores24/reports") ||
            url.pathname.startsWith("/stores24/settings") ||
            url.pathname.startsWith("/stores24/pos") ||
            url.pathname.startsWith("/stores24/print-bill");
        const isAdminRoute =
            url.pathname.startsWith("/stores24/dashboard") ||
            url.pathname.startsWith("/stores24/products") ||
            url.pathname.startsWith("/stores24/inventory") ||
            url.pathname.startsWith("/stores24/sales") ||
            url.pathname.startsWith("/stores24/purchases") ||
            url.pathname.startsWith("/stores24/suppliers") ||
            url.pathname.startsWith("/stores24/staff") ||
            url.pathname.startsWith("/stores24/reports") ||
            url.pathname.startsWith("/stores24/settings");

        if (isLoginPage && session) {
            const destination = session.role === "Cashier" ? "/stores24/pos" : "/stores24/dashboard";
            return NextResponse.redirect(new URL(destination, request.url));
        }

        if (isProtectedStores24Route && !session) {
            const loginUrl = new URL("/stores24/login", request.url);
            loginUrl.searchParams.set("next", url.pathname);
            return NextResponse.redirect(loginUrl);
        }

        if (session?.role === "Cashier" && isAdminRoute) {
            return NextResponse.redirect(new URL("/stores24/pos", request.url));
        }
    }

    if (url.pathname.startsWith("/employee")) {
        const session = await readEmployeeSessionToken(request.cookies.get(getEmployeeSessionCookieName())?.value);
        const isLoginPage = url.pathname === "/employee/login";
        const isProtectedEmployeeRoute = url.pathname.startsWith("/employee/portal");

        if (isLoginPage && session) {
            return NextResponse.redirect(new URL("/employee/portal", request.url));
        }

        if (isProtectedEmployeeRoute && !session) {
            return NextResponse.redirect(new URL("/employee/login", request.url));
        }
    }

    return NextResponse.next();
}
