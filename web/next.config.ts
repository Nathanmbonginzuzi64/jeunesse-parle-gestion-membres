import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // jsPDF peut tirer html2canvas classique (sans oklch) — forcer html2canvas-pro partout.
  turbopack: {
    resolveAlias: {
      html2canvas: "html2canvas-pro",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      html2canvas: path.resolve(__dirname, "node_modules/html2canvas-pro"),
    };
    return config;
  },
};

export default nextConfig;
