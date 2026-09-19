import path from "node:path"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

const env = loadEnv("test", process.cwd(), "")

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        env.DATABASE_URL ??
        "postgresql://mac@localhost:5432/voicedesk",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
