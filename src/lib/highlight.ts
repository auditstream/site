import { createHighlighter, type Highlighter } from "shiki";
import { auditstreamLight } from "../styles/shiki-themes.mjs";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [auditstreamLight as any],
      langs: ["sql", "ts", "typescript", "json", "bash", "shell", "rust", "toml"],
    });
  }
  return highlighterPromise;
}

// Map Shiki's repeated inline color styles to tiny semantic classes (cuts HTML weight cleanly)
const COLOR_TO_CLASS: Record<string, string> = {
  "#1d4ed8": "st-kw",
  "#0f172a": "st-fg",
  "#047857": "st-str",
  "#1e40af": "st-num",
  "#334155": "st-prop",
  "#b91c1c": "st-del",
};

export async function highlightCode(
  code: string,
  lang: "sql" | "ts" | "json" | "bash" | "rust" | "toml" = "ts",
  options?: { lineNumbers?: boolean; highlightAuditComment?: boolean }
): Promise<string> {
  const highlighter = await getHighlighter();
  const trimmed = code.replace(/\n$/, "");
  let html = highlighter.codeToHtml(trimmed, {
    lang,
    theme: "auditstream-light",
  });

  // Compact inline style="color:#..." into short semantic classes
  html = html.replace(/<span style="([^"]+)">/g, (full, styleStr: string) => {
    const m = styleStr.match(/color:(#[0-9a-fA-F]{6})/);
    if (!m) return full;
    const hex = m[1].toLowerCase();
    if (hex === "#5b6676") {
      const isItalic = styleStr.includes("font-style:italic");
      return `<span class="${isItalic ? "st-cm" : "st-punc"}">`;
    }
    if (hex === "#0f172a" && styleStr.includes("font-weight:bold")) {
      return '<span class="st-fn">';
    }
    const cls = COLOR_TO_CLASS[hex];
    return cls ? `<span class="${cls}">` : full;
  });

  if (options?.highlightAuditComment) {
    html = html.replace(
      /(\/\*auditstream=&#39;[^&]+&#39;\*\/|\/\*auditstream='[^']+'\*\/)/g,
      '<mark class="tok-audit">$1</mark>'
    );
  }

  if (options?.lineNumbers) {
    const rawLines = trimmed.split("\n");
    let n = 0;
    html = html.replace(/<span class="line">/g, () => {
      const idx = n;
      n += 1;
      const lineText = rawLines[idx] ?? "";
      const prevLine = idx > 0 ? (rawLines[idx - 1] ?? "") : "";
      const label =
        lang === "bash"
          ? lineText.trim().startsWith("#") || prevLine.trimEnd().endsWith("\\")
            ? " "
            : "$"
          : String(n);
      return `<span class="line"><span class="ln" aria-hidden="true">${label}</span>`;
    });
  }

  return html;
}
