import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  // Fail fast in development/build if the URL is not configured
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is not set. Please define it in mobile/.env or your build environment."
  );
}

export const convex = new ConvexReactClient(convexUrl);
