import type { NextRequest } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@projectfe/core-api";

import { env } from "~/env";

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
};

const handler = async (req: NextRequest) => {
  const clerkClient = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
  });

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
        lang:
          (req.headers.get("x-lang") as "en" | "fr" | undefined) ??
          (req.cookies.get("NEXT_LOCALE")?.value as "en" | "fr" | undefined) ??
          "en",
        currency:
          (req.cookies.get("x-currency")?.value as
            | "EUR"
            | "USD"
            | "TRY"
            | undefined) ?? "EUR",
        clerkClient,
        project: {
          homeUrl: env.NEXT_PUBLIC_PROJECT_HOME_URL,
          name: env.NEXT_PUBLIC_PROJECT_NAME,
        },
      }),
    onError({ error, path }) {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  });

  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };
