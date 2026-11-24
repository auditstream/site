import { defineConfig, passthroughImageService } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { auditstreamDark, auditstreamLight } from "./src/styles/shiki-themes.mjs";

// Wrap markdown <table> elements in a scrollable container at build time (0 KB client JS)
function rehypeWrapTables() {
  return (tree) => {
    const visit = (node) => {
      if (!node || !Array.isArray(node.children)) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === "element" && child.tagName === "table") {
          node.children[i] = {
            type: "element",
            tagName: "div",
            properties: { className: ["table-wrap"] },
            children: [child],
          };
        } else {
          visit(child);
        }
      }
    };
    visit(tree);
  };
}

export default defineConfig({
  site: "https://auditstream.dev",
  output: "static",
  compressHTML: true,
  image: {
    service: passthroughImageService(),
  },
  integrations: [sitemap()],
  markdown: {
    rehypePlugins: [rehypeWrapTables],
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
