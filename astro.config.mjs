import { defineConfig, passthroughImageService } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { auditstreamDark, auditstreamLight } from "./src/styles/shiki-themes.mjs";

export default defineConfig({
  site: "https://auditstream.dev",
  output: "static",
  compressHTML: true,
  image: {
    service: passthroughImageService(),
  },
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        light: auditstreamLight,
        dark: auditstreamDark,
      },
      defaultColor: false,
      wrap: false,
    },
  },
});
