import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16),
  ADMIN_SEED_EMAIL: z.string().email().default("admin@bryozoo.local"),
  ADMIN_SEED_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  NEXT_PUBLIC_MAP_TILE_URL: z
    .string()
    .default("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  NEXT_PUBLIC_MAP_ATTRIBUTION: z
    .string()
    .default("&copy; OpenStreetMap contributors"),
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  NEXT_PUBLIC_MAP_TILE_URL: process.env.NEXT_PUBLIC_MAP_TILE_URL,
  NEXT_PUBLIC_MAP_ATTRIBUTION: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION,
});

export const publicEnv = {
  mapTileUrl: env.NEXT_PUBLIC_MAP_TILE_URL,
  mapAttribution: env.NEXT_PUBLIC_MAP_ATTRIBUTION,
};
