// Custom Dual-Theme Shiki palettes tuned to Auditstream's Warm Architectural Paper (Light)
// and Forensic Ledger Obsidian (Dark) design system.
// Zero JS highlighter shipped to the browser — every syntax color meets WCAG 2.1 AA (>= 4.5:1)
// on #ffffff (Light) and #131820 (Dark).

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
      scope: [
        "keyword",
        "storage.type",
        "storage.modifier",
        "keyword.operator.expression",
        "entity.name.section",
        "entity.name.tag",
      ],
      settings: { foreground: "#1d4ed8" },
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
      scope: [
        "variable.other.property",
        "variable.other.key",
        "meta.object-literal.key",
        "support.type.property-name",
      ],
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

export const auditstreamDark = {
  name: "auditstream-dark",
  type: "dark",
  colors: {
    "editor.background": "#131820",
    "editor.foreground": "#edf1f5",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#8392a6", fontStyle: "italic" },
    },
    {
      scope: [
        "keyword",
        "storage.type",
        "storage.modifier",
        "keyword.operator.expression",
        "entity.name.section",
        "entity.name.tag",
      ],
      settings: { foreground: "#6ba6ff" },
    },
    {
      scope: ["entity.name.function", "support.function", "entity.name.type", "entity.name.class"],
      settings: { foreground: "#edf1f5", fontStyle: "bold" },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: { foreground: "#34d399" },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.other", "support.constant"],
      settings: { foreground: "#93bfff" },
    },
    {
      scope: [
        "variable.other.property",
        "variable.other.key",
        "meta.object-literal.key",
        "support.type.property-name",
      ],
      settings: { foreground: "#cfd8e3" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "#8392a6" },
    },
    {
      scope: ["markup.deleted", "meta.diff.header.from-file"],
      settings: { foreground: "#f87171" },
    },
    {
      scope: ["markup.inserted", "meta.diff.header.to-file"],
      settings: { foreground: "#34d399" },
    },
  ],
};
