// Custom Light-Only Shiki theme tuned to Auditstream's Warm Architectural Paper palette.
// Zero JS highlighter shipped to the browser — every syntax color meets WCAG 2.1 AA (>= 4.5:1) on #ffffff.

export const auditstreamLight = {
  name: "auditstream-light",
  type: "light",
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#0f172a",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#5b6676", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier", "keyword.operator.expression"],
      settings: { foreground: "#1d4ed8", fontStyle: "medium" },
    },
    {
      scope: ["entity.name.function", "support.function", "entity.name.type", "entity.name.class"],
      settings: { foreground: "#0f172a", fontStyle: "bold" },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: { foreground: "#047857" },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.other", "support.constant"],
      settings: { foreground: "#1e40af" },
    },
    {
      scope: ["variable.other.property", "meta.object-literal.key", "support.type.property-name"],
      settings: { foreground: "#334155" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "#5b6676" },
    },
    {
      scope: ["markup.deleted", "meta.diff.header.from-file"],
      settings: { foreground: "#b91c1c" },
    },
    {
      scope: ["markup.inserted", "meta.diff.header.to-file"],
      settings: { foreground: "#047857" },
    },
  ],
};
