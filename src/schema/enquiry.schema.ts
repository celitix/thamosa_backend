import { z } from "zod";

const contactEnquiry = z.object({
  fullName: z.string().min(3).max(100),
  email: z.email("Invalid email address"),
  mobile: z.string().min(10).max(10),
  intrestedProperty: z.string(),

  checkInDate: z.coerce.date().optional(),
  checkOutDate: z.coerce.date().optional(),
  noOfGuests: z.number().min(1),

  message: z.string().max(30),
});

export { contactEnquiry };
