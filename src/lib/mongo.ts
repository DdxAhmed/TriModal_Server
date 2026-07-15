import { MongoClient, type Collection, type Db } from "mongodb";
import { logger } from "./logger";

// Reuse a single client/connection across the process (recommended by the
// MongoDB driver) instead of opening a new connection per request.
let client: MongoClient | null = null;
let connectPromise: Promise<MongoClient> | null = null;

async function getClient(): Promise<MongoClient> {
  if (!client) {
    const MONGODB_URI = process.env["MONGODB_URI"];
    if (!MONGODB_URI) {
      throw new Error(
        "MONGODB_URI must be set. Did you forget to add the MongoDB connection secret?",
      );
    }
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
  }

  if (!connectPromise) {
    const localClient = client;
    connectPromise = localClient.connect().catch((err: any) => {
      // Reset so a later request can retry the connection instead of being
      // stuck with a permanently rejected promise.
      connectPromise = null;
      throw err;
    });
  }
  return connectPromise;
}

export async function getDb(): Promise<Db> {
  const connected = await getClient();
  return connected.db();
}

export interface VoteDocument {
  mobile?: string;
  phoneNumber?: string;
  createdAt: Date;
}

export async function getVotesCollection(): Promise<Collection<VoteDocument>> {
  const db = await getDb();
  return db.collection<VoteDocument>("votes");
}

let indexesEnsured = false;

/**
 * Ensures the unique index on `mobile` exists so duplicate votes are
 * rejected atomically at the database level, not just via an application
 * check (which would be vulnerable to a race between two near-simultaneous
 * submissions from the same number).
 */
export async function ensureVoteIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const votes = await getVotesCollection();
  try {
    await votes.createIndex({ mobile: 1 }, { unique: true, sparse: true });
  } catch (err: any) {
    logger.warn({ err }, "Could not create unique index on mobile");
  }
  try {
    await votes.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
  } catch (err: any) {
    logger.warn({ err }, "Could not create unique index on phoneNumber");
  }
  indexesEnsured = true;
  logger.info("Ensured unique sparse indexes on votes.mobile and votes.phoneNumber");
}
