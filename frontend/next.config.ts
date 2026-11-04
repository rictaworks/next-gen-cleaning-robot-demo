import type { NextConfig } from "next";

/**
 * フロントエンドは静的書き出し（output: "export"）し、Cloudflare Workers（worker/）が配信する。
 * API（/api/*）は同一オリジンで呼ぶ。開発時のみ next dev（3000 番）から wrangler dev（既定 8787 番）へ転送する。
 */
const nextConfig: NextConfig = {
  output: "export",
};

if (process.env.NODE_ENV === "development") {
  const apiOrigin = process.env.API_ORIGIN || "http://127.0.0.1:8787";
  // rewrites は静的書き出しでは使えないため、開発サーバーでのみ設定する。
  nextConfig.rewrites = async () => ({
    beforeFiles: [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ],
    afterFiles: [],
    fallback: [],
  });
}

export default nextConfig;
