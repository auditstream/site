import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.enum(["Get Started", "SDKs & Languages", "Operate", "Reference"]),
    order: z.number(),
    badge: z.string().optional(),
    eyebrow: z.string().optional(),
  }),
});

export const collections = { docs };
