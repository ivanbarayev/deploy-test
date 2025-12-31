import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

import { DB_SCHEMA_NAME } from "../_constants";
import { DB_SCHEMA_SUBNAME } from "./_constants";

export const UserSchema = pgTable(
  DB_SCHEMA_NAME + DB_SCHEMA_SUBNAME + "users",
  {
    id: serial("id").primaryKey().notNull(),
    clerkId: text("clerk_id"),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("clerkId_uniqueIndex").on(table.clerkId)],
).enableRLS();

export const CreateUserSchema = createInsertSchema(UserSchema).omit({
  createdAt: true,
});
