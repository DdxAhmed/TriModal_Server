import express from 'express';
import { Vote } from '../models/Vote.js';

const router = express.Router();

// Local tracking counter
let localVoteCount = 0;

// Initialize the local tracking counter from DB
export async function initVoteCounter() {
  try {
    localVoteCount = await Vote.countDocuments();
    console.log(`Local vote tracking counter initialized to: ${localVoteCount}`);
  } catch (error) {
    console.error('Failed to initialize local vote tracking counter:', error.message);
  }
}

// POST /api/vote
router.post('/vote', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    // Check if the phone number already exists in MongoDB
    const existingVote = await Vote.findOne({ phoneNumber });
    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: "This phone number has already voted."
      });
    }

    // Save the new Vote document
    const newVote = new Vote({ phoneNumber });
    await newVote.save();

    // Calculate updated count
    const updatedCount = await Vote.countDocuments();
    localVoteCount = updatedCount;

    return res.status(200).json({
      success: true,
      isVoted: true,
      totalVotes: updatedCount
    });
  } catch (error) {
    console.error('Error handling vote POST:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This phone number has already voted."
      });
    }
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// POST /api/unvote
router.post('/unvote', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    // Find and delete that phone number document from MongoDB
    await Vote.findOneAndDelete({ phoneNumber });

    // Calculate updated count
    const updatedCount = await Vote.countDocuments();
    localVoteCount = updatedCount;

    return res.status(200).json({
      success: true,
      isVoted: false,
      totalVotes: updatedCount
    });
  } catch (error) {
    console.error('Error handling unvote POST:', error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// POST /api/vote/check
router.post('/vote/check', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const existingVote = await Vote.findOne({ phoneNumber });
    return res.json({ exists: !!existingVote });
  } catch (error) {
    console.error('Error checking vote status:', error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// GET /api/vote/count
router.get('/vote/count', async (req, res) => {
  try {
    const count = await Vote.countDocuments();
    localVoteCount = count;
    return res.json({ totalVotes: count });
  } catch (error) {
    console.error('Error handling vote count GET:', error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
export { router as voteRouter };
