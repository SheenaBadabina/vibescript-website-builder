// src/middleware.ts
export { default } from "next-auth/middleware";

/**
 * Protect any routes that require a signed-in user.
 * Add or remove paths in the matcher array as your app grows.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/studio/:path*",
    "/account/:path*"
  ]
};
