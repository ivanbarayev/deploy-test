/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import type { ClerkClient, SessionAuthObject } from "@clerk/backend";
import type { TablesRelationalConfig } from "drizzle-orm";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import { and, eq } from "@projectfe/core-db";
import { db } from "@projectfe/core-db/client";
import { UserSchema } from "@projectfe/core-db/schema";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

export const createTRPCContext = async (opts: {
  lang: "en" | "fr";
  currency: "EUR" | "USD" | "TRY";
  headers: Headers;
  clerkClient: ClerkClient;
  project: {
    homeUrl: string;
    name: string;
  };
}) => {
  const clerkAuth: SessionAuthObject = await auth();
  const clerkClient = opts.clerkClient;
  const lang = opts.lang;
  const currency = opts.currency;
  const project = opts.project;

  const functions = {
    getUserId: async (props?: {
      withCurrentUser?: boolean;
      tx?: PgTransaction<
        PgQueryResultHKT,
        Record<string, unknown>,
        TablesRelationalConfig
      >;
    }) => {
      if (props?.withCurrentUser && props.tx) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot use withCurrentUser with a transaction",
        });
      }
      if (!clerkAuth.userId) {
        return;
      }
      if (props?.withCurrentUser) {
        const user = await currentUser();

        if (!user) {
          return;
        }
        return Number(user.externalId);
      }
      const db$ = (props?.tx ?? db) as unknown as typeof db;
      const userFromDb = await db$.query.UserSchema.findFirst({
        where: and(eq(UserSchema.clerkId, clerkAuth.userId)),
        columns: {
          id: true,
        },
      });
      if (!userFromDb) {
        return;
      }
      return userFromDb.id;
    },
  };

  return {
    lang,
    currency,
    clerkAuth,
    clerkClient,
    db,
    project,
    functions,
  };
};
/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/core-api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-1000ms
    const waitMs = Math.floor(Math.random() * 900) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  let result: Awaited<ReturnType<typeof next>>;

  try {
    result = await next();
  } catch (error) {
    console.error(
      `[TRPC] ${path} failed to execute (took ${Date.now() - start}ms to execute):`,
      error,
    );
    throw error;
  }

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized.
 */
export const publicProcedure = t.procedure;

export const protectedProcedure: typeof t.procedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.clerkAuth.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        clerkAuth: ctx.clerkAuth,
      },
    });
  });
