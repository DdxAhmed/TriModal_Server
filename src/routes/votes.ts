import { Router, type IRouter } from "express";
import { MongoServerError } from "mongodb";
import {
  CreateVoteBody,
  CheckVoteQueryParams,
  CheckVoteBody,
  GetVoteCountResponse,
  CheckVoteResponse,
  CreateVoteResponse,
} from "../lib/schemas";
import { ensureVoteIndexes, getVotesCollection } from "../lib/mongo";

const router: IRouter = Router();

// A simple, permissive digits-only phone validation.
function normalizeMobile(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\+?\d{8,20}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

// Handler for getting vote count (both /votes/count and /vote/count)
async function getVoteCountHandler(req: any, res: any): Promise<void> {
  try {
    const votes = await getVotesCollection();
    const count = await votes.estimatedDocumentCount();
    req.log.info({ count }, "Fetched vote count");
    res.json(GetVoteCountResponse.parse({
      count,
      totalVotes: count
    }));
  } catch (err: any) {
    req.log.error(err, "Error in getVoteCountHandler");
    res.status(500).json({ error: "Internal server error" });
  }
}

router.get("/votes/count", getVoteCountHandler);
router.get("/vote/count", getVoteCountHandler);

// Handler for checking vote (GET /votes/check query params, POST /vote/check body params)
async function checkVoteHandler(req: any, res: any): Promise<void> {
  try {
    let rawMobile: string | undefined;

    if (req.method === "POST") {
      const parsedBody = CheckVoteBody.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({ error: parsedBody.error.message });
        return;
      }
      rawMobile = parsedBody.data.phoneNumber ?? parsedBody.data.mobile;
    } else {
      const parsedQuery = CheckVoteQueryParams.safeParse(req.query);
      if (!parsedQuery.success) {
        res.status(400).json({ error: parsedQuery.error.message });
        return;
      }
      rawMobile = parsedQuery.data.mobile ?? parsedQuery.data.phoneNumber;
    }

    if (!rawMobile) {
      res.status(400).json({ error: "Phone or mobile number is required" });
      return;
    }

    const mobile = normalizeMobile(rawMobile);
    if (!mobile) {
      res.status(400).json({ error: "Invalid mobile number format" });
      return;
    }

    const votes = await getVotesCollection();
    // Query by either mobile or phoneNumber field
    const existing = await votes.findOne(
      {
        $or: [
          { mobile: mobile },
          { phoneNumber: mobile }
        ]
      },
      { projection: { _id: 1 } }
    );

    const hasVoted = existing !== null;
    res.json(CheckVoteResponse.parse({
      hasVoted,
      exists: hasVoted
    }));
  } catch (err: any) {
    req.log.error(err, "Error in checkVoteHandler");
    res.status(500).json({ error: "Internal server error" });
  }
}

router.get("/votes/check", checkVoteHandler);
router.post("/vote/check", checkVoteHandler);

// Handler for creating a vote (POST /votes and POST /vote)
async function createVoteHandler(req: any, res: any): Promise<void> {
  try {
    const parsedBody = CreateVoteBody.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: parsedBody.error.message });
      return;
    }

    const rawMobile = parsedBody.data.phoneNumber ?? parsedBody.data.mobile;
    if (!rawMobile) {
      res.status(400).json({ error: "Phone or mobile number is required" });
      return;
    }

    const mobile = normalizeMobile(rawMobile);
    if (!mobile) {
      res.status(400).json({ error: "Invalid mobile number format" });
      return;
    }

    await ensureVoteIndexes();
    const votes = await getVotesCollection();
    const createdAt = new Date();

    try {
      // Store BOTH mobile and phoneNumber fields in MongoDB for maximum compatibility
      const result = await votes.insertOne({
        mobile,
        phoneNumber: mobile,
        createdAt
      });
      
      const count = await votes.estimatedDocumentCount();
      req.log.info({ mobile }, "Vote recorded");

      res.status(201).json(
        CreateVoteResponse.parse({
          id: result.insertedId.toString(),
          mobile,
          createdAt: createdAt.toISOString(),
          success: true,
          isVoted: true,
          totalVotes: count
        })
      );
    } catch (err) {
      // Duplicate key error (E11000)
      if (err instanceof MongoServerError && err.code === 11000) {
        req.log.warn({ mobile }, "Rejected duplicate vote");
        
        // Return 400 with success: false message for old frontend
        res.status(400).json({
          success: false,
          message: "This phone number has already voted.",
          error: "This phone number has already voted"
        });
        return;
      }
      throw err;
    }
  } catch (err: any) {
    req.log.error(err, "Error in createVoteHandler");
    res.status(500).json({ error: "Internal server error" });
  }
}

router.post("/votes", createVoteHandler);
router.post("/vote", createVoteHandler);

// Handler for removing a vote (POST /unvote)
router.post("/unvote", async (req: any, res: any): Promise<void> => {
  try {
    const parsedBody = CreateVoteBody.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: parsedBody.error.message });
      return;
    }

    const rawMobile = parsedBody.data.phoneNumber ?? parsedBody.data.mobile;
    if (!rawMobile) {
      res.status(400).json({ error: "Phone or mobile number is required" });
      return;
    }

    const mobile = normalizeMobile(rawMobile);
    if (!mobile) {
      res.status(400).json({ error: "Invalid mobile number format" });
      return;
    }

    const votes = await getVotesCollection();
    // Delete documents matching either mobile or phoneNumber field
    await votes.deleteOne({
      $or: [
        { mobile: mobile },
        { phoneNumber: mobile }
      ]
    });

    const count = await votes.estimatedDocumentCount();
    req.log.info({ mobile }, "Vote removed");

    res.status(200).json({
      success: true,
      isVoted: false,
      totalVotes: count
    });
  } catch (err: any) {
    req.log.error(err, "Error in unvote handler");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
