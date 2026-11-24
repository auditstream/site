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

  if (options?.highlightAuditComment) {
    // Highlight trailing sqlcommenter auditstream tags AND actor object literals
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
