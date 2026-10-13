import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    year: z.number(),
    index: z.string(),
    tags: z.array(z.string()),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    articleUrl: z.string().optional(),
    order: z.number().default(0),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, posts };
