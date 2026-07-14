import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const Vote = mongoose.model('Vote', voteSchema);
