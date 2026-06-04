import { z } from "zod";

const sendOtpSchema = z.object({
  mobile: z.string().min(10).max(10),
  type: z.string().optional(),
});

const verifyOtpSchema = z.object({
  mobile: z.string().min(10).max(10),
  otpId: z.string(),
  otp: z.string().min(6).max(6),
  type: z.string().optional(),
});

export { sendOtpSchema, verifyOtpSchema };
