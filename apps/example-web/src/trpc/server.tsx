import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createClerkClient } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import type { AppRouter } from "@projectfe/core-api";
import { appRouter, createTRPCContext } from "@projectfe/core-api";

import { env } from "~/env";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  const cookies$ = await cookies();

  const clerkClient = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
  });

  return createTRPCContext({
    headers: heads,
    lang:
      (heads.get("x-lang") as "en" | "fr" | undefined) ??
      (cookies$.get("NEXT_LOCALE")?.value as "en" | "fr" | undefined) ??
      "en",
    currency:
      (cookies$.get("x-currency")?.value as
        | "EUR"
        | "USD"
        | "TRY"
        | undefined) ?? "EUR",
    clerkClient,
    project: {
      homeUrl: env.NEXT_PUBLIC_PROJECT_HOME_URL,
      name: env.NEXT_PUBLIC_PROJECT_NAME,
    },
  });
});

export const getQueryClient = cache(createQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  router: appRouter,
  ctx: createContext,
  queryClient: getQueryClient,
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === "infinite") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    return queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    return queryClient.prefetchQuery(queryOptions);
  }
}
