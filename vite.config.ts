/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://harshagarwal2412-cell.github.io/wheres-my-money-stuck-funds-triage/ on GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/wheres-my-money-stuck-funds-triage/" : "/",
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
