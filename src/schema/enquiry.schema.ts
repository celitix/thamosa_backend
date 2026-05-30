import { z } from "zod";

const contactEnquiry = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email("Invalid email address"),
  mobile: z.string().min(10).max(10),
  companyName: z.string().min(1).max(100),
  service: z.string().min(5).max(100),
  message: z.string().max(30),
  source: z
    .enum(["contact", "book-demo", "lp-book-demo", "lp-book-demo-fb"])
    .optional(),

  utmData: z
    .preprocess(
      (val) => (typeof val === "string" ? JSON.parse(val) : val),
      z.object({
        source: z.string().min(1).max(60),
        medium: z.string().min(1).max(60),
        campaign: z.string().min(1).max(60),
        gclid: z.string().min(1).max(60).optional(),
        url: z.string().min(1).max(500).optional(),
      }),
    )
    .optional(),
});

const carreerEnquiry = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email("Invalid email address"),
  mobile: z.string().min(10).max(10),
  designation: z.string().min(1).max(100),
  expInYears: z.string().min(1).max(100),
  jobTitle: z.string().min(1).max(100),
  message: z.string().min(30).max(500).optional(),
});

export { contactEnquiry, carreerEnquiry };
