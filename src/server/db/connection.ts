import mongoose from "mongoose";
import { env } from "@/config/env";
import { ConfigError, DatabaseError } from "@/lib/errors/app-error";

/**
 * Cached Mongoose connection.
 *
 * Next.js (dev + serverless) re-imports modules frequently; without caching we'd
 * open a new connection on every request and exhaust the pool. We stash the
 * connection promise on `globalThis` so it survives hot reloads and is reused.
 *
 * If MONGODB_URI is not configured, `connectToDatabase()` throws a typed
 * ConfigError. Callers (repositories/services) translate that into an honest
 * "database not configured" UI state — the app still boots and renders.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { _mongooseCache?: MongooseCache };

const cache: MongooseCache = globalForMongoose._mongooseCache ?? { conn: null, promise: null };
globalForMongoose._mongooseCache = cache;

export function isDatabaseConfigured(): boolean {
  return env.isDatabaseConfigured;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!env.MONGODB_URI) {
    throw new ConfigError(
      "MONGODB_URI is not set. Configure the database in .env.local to enable data features.",
    );
  }

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((cause) => {
        cache.promise = null; // allow retry on next call
        throw new DatabaseError("Failed to connect to MongoDB.", cause);
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
