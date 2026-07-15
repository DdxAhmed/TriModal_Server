import { z } from "zod";

export const HealthCheckResponse = z.object({
  status: z.string(),
});

export const CheckVoteQueryParams = z.object({
  mobile: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const CheckVoteBody = z.object({
  mobile: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const CreateVoteBody = z.object({
  mobile: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const GetVoteCountResponse = z.object({
  count: z.number().optional(),
  totalVotes: z.number().optional(),
});

export const CheckVoteResponse = z.object({
  hasVoted: z.boolean().optional(),
  exists: z.boolean().optional(),
});

export const CreateVoteResponse = z.object({
  id: z.string().optional(),
  mobile: z.string().optional(),
  createdAt: z.string().optional(),
  success: z.boolean().optional(),
  isVoted: z.boolean().optional(),
  totalVotes: z.number().optional(),
});
