import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { openApiSpec } from "~/lib/openapi";

/**
 * GET /api/openapi.json
 * Returns the OpenAPI specification for the API
 */
export function GET(_request: NextRequest) {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
