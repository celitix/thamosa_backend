import { z } from "zod";

const parseJsonField = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const blogCreate = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  shortDesc: z.string().min(50),
  content: z.string().min(100),
  category: z.string().min(5),
  tags: z.string().min(1),
  publishedDate: z.coerce.date().optional(),

  seo: z.preprocess(
    parseJsonField,
    z.object({
      title: z.string().min(1),
      desc: z.string().min(1),
      keywords: z.string().min(1),
    }),
  ),
  status: z.enum(["draft", "published"]).default("draft"),
});

const blogUpdate = blogCreate.partial().extend({
  id: z.string().min(1),
  seo: z.preprocess(
    parseJsonField,
    z
      .object({
        id: z.string().optional(),
        title: z.string().min(1),
        desc: z.string().min(1),
        keywords: z.string().min(1),
      })
      .optional(),
  ),
});

export { blogCreate, blogUpdate };
