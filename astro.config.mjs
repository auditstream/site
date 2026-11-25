import { defineConfig, passthroughImageService } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { auditstreamLight } from "./src/styles/shiki-themes.mjs";

function extractText(node) {
  if (!node) return "";
  if (node.type === "text") return node.value || "";
  if (Array.isArray(node.children)) {
    return node.children.map(extractText).join("");
  }
  return "";
}

function createSlugger() {
  const seen = new Map();
  return (raw) => {
    let base = raw
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+$/g, "");
    if (!base) base = "section";
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

// Wrap markdown <table> elements in a keyboard-scrollable container at build time (0 KB client JS)
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
            properties: {
              className: ["table-wrap"],
              tabIndex: 0,
              role: "region",
              "aria-label": "Scrollable reference table",
            },
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

// Wrap markdown <pre> blocks in framed header + Copy button at build time (0 CLS)
// and append clickable # section anchors to h2/h3 headings at build time.
function rehypeCodeFrames() {
  return (tree) => {
    const slug = createSlugger();
    const visit = (node) => {
      if (!node || !Array.isArray(node.children)) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type !== "element") continue;

        if (child.tagName === "pre") {
          const props = child.properties || {};
          const rawLang = props["data-language"] ?? props.dataLanguage ?? "code";
          const lang = String(rawLang || "code");
          node.children[i] = {
            type: "element",
            tagName: "div",
            properties: { className: ["doc-code-frame"] },
            children: [
              {
                type: "element",
                tagName: "div",
                properties: { className: ["doc-code-bar"] },
                children: [
                  {
                    type: "element",
                    tagName: "span",
                    properties: { className: ["doc-code-lang"] },
                    children: [{ type: "text", value: lang }],
                  },
                  {
                    type: "element",
                    tagName: "button",
                    properties: {
                      type: "button",
                      className: ["chip-btn", "doc-copy-btn"],
                      "aria-label": `Copy ${lang} code block`,
                    },
                    children: [{ type: "text", value: "Copy" }],
                  },
                ],
              },
              child,
            ],
          };
          continue;
        }

        if (child.tagName === "h2" || child.tagName === "h3") {
          const label = extractText(child).trim();
          child.properties = child.properties || {};
          const id =
            typeof child.properties.id === "string" && child.properties.id.length > 0
              ? child.properties.id
              : slug(label);
          child.properties.id = id;
          child.children = child.children || [];
          // Empty <a> renders visual "#" via CSS ::before so Astro's heading collector
          // and Pagefind keep clean heading text without trailing "#" noise.
          child.children.push({
            type: "element",
            tagName: "a",
            properties: {
              className: ["heading-anchor"],
              href: `#${id}`,
              "aria-label": label ? `Link to section: ${label}` : `Link to #${id}`,
            },
            children: [],
          });
        }

        visit(child);
      }
    };
    visit(tree);
  };
}

// Mark long inline <code> spans (> 36 chars, outside <pre> and table cells) as wrappable
// so narrow 390px viewports never blow out horizontally while normal short tokens stay unbroken.
function rehypeInlineCode() {
  return (tree) => {
    const visit = (node) => {
      if (!node || !Array.isArray(node.children)) return;
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "pre" || child.tagName === "td" || child.tagName === "th") {
          continue;
        }
        if (child.tagName === "code") {
          if (extractText(child).length > 36) {
            child.properties = child.properties || {};
            const existing = child.properties.className;
            const classes = Array.isArray(existing)
              ? [...existing]
              : typeof existing === "string"
                ? existing.split(/\s+/).filter(Boolean)
                : [];
            if (!classes.includes("ic-wrap")) classes.push("ic-wrap");
            child.properties.className = classes;
          }
          continue;
        }
        visit(child);
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
    rehypePlugins: [rehypeWrapTables, rehypeCodeFrames, rehypeInlineCode],
    shikiConfig: {
      theme: auditstreamLight,
      wrap: false,
    },
  },
});
