import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 根级 vitest 只收集 scripts/ 下的根级测试（如 web:smoke:hub、architecture-check）。
    // 各 app/package 的测试由各自的 `pnpm --filter` + 本地 vite/vitest 配置负责，
    // 不应被根级收集（否则相对路径 fixture 解析会失败）。
    include: ["scripts/**/*.test.ts"],
    // 排除 pivot 前遗留 / 临时 worktree 副本，避免其同名测试连同一个数据库互相踩踏。
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.worktrees/**",
      "**/.jj/**",
    ],
  },
});
