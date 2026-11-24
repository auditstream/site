import { createHighlighter, type Highlighter } from "shiki";
import { auditstreamDark, auditstreamLight } from "../styles/shiki-themes.mjs";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [auditstreamDark as any, auditstreamLight as any],
      langs: ["sql", "ts", "typescript", "json", "bash", "shell", "rust", "toml"],
    });
  }
  return highlighterPromise;
}

// Map Shiki's repeated inline CSS variables to tiny semantic classes (cuts HTML by ~40%)
const COLOR_TO_CLASS: Record<string, string> = {
  "#687482": "st-cm",
  "#1a4ea8": "st-kw",
  "#0c1015": "st-fn",
  "#0c6e54": "st-str",
  "#1d56b8": "st-num",
  "#2c3540": "st-prop",
  "#6b7685": "st-punc",
  "#b83227": "st-del",
  "#0c7559": "st-add",
  "#101418": "st-fg",
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
    themes: {
      light: "auditstream-light",
      dark: "auditstream-dark",
    },
    defaultColor: false,
  });

  // Compact inline style="--shiki-light:...;--shiki-dark:..." into short semantic classes
  html = html.replace(/<span style="([^"]+)">/g, (full, styleStr: string) => {
    const m = styleStr.match(/--shiki-light:(#[0-9a-fA-F]{6})/);
    const cls = m ? COLOR_TO_CLASS[m[1].toLowerCase()] : null;
    return cls ? `<span class="${cls}">` : full;
  });

  if (options?.highlightAuditComment) {
    html = html.replace(
      /(\/\*auditstream=&#39;[^&]+&#39;\*\/|\/\*auditstream='[^']+'\*\/)/g,
      '<mark class="tok-audit">$1</mark>'
    );
  }

  if (options?.lineNumbers) {
    let n = 0;
    html = html.replace(/<span class="line">/g, () => {
      n += 1;
      const label = lang === "bash" ? (n === 1 ? "$" : " ") : String(n);
      return `<span class="line"><span class="ln">${label}</span>`;
    });
  }

  return html;
}
