/**
 * Corsair Management API Route
 * Handles all Corsair internal API calls (OAuth connect/callback, token management)
 * Mounted at: /api/corsair/[...path]
 */
import { toNextJsHandler } from "corsair";
import { corsair } from "../../../utils/corsair";

export const { GET, POST } = toNextJsHandler(corsair, {
  basePath: "/api/corsair",
});
