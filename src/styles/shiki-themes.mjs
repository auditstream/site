// Custom Shiki themes tuned to Auditstream's Forensic Ledger palette
// Zero JS highlighter shipped to the browser — dual themes switched purely via CSS

export const auditstreamDark = {
  name: "auditstream-dark",
  type: "dark",
  colors: {
    "editor.background": "#080a0d",
    "editor.foreground": "#e6ecf2",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#738294", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier", "keyword.operator.expression"],
      settings: { foreground: "#93b4dc", fontStyle: "medium" },
    },
    {
      scope: ["entity.name.function", "support.function", "entity.name.type", "entity.name.class"],
      settings: { foreground: "#f0f4f8", fontStyle: "bold" },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: { foreground: "#7fd4b8" },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.other", "support.constant"],
      settings: { foreground: "#6ba6ff" },
    },
    {
      scope: ["variable.other.property", "meta.object-literal.key", "support.type.property-name"],
      settings: { foreground: "#c5d1de" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "#7c8a9b" },
    },
    {
      scope: ["markup.deleted", "meta.diff.header.from-file"],
      settings: { foreground: "#f07167" },
    },
    {
      scope: ["markup.inserted", "meta.diff.header.to-file"],
      settings: { foreground: "#34d399" },
    },
  ],
};

export const auditstreamLight = {
  name: "auditstream-light",
  type: "light",
  colors: {
    "editor.background": "#f8f7f3",
    "editor.foreground": "#101418",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#5a6674", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier", "keyword.operator.expression"],
      settings: { foreground: "#1a4ea8", fontStyle: "medium" },
    },
    {
      scope: ["entity.name.function", "support.function", "entity.name.type", "entity.name.class"],
      settings: { foreground: "#0c1015", fontStyle: "bold" },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: { foreground: "#0c6e54" },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.other", "support.constant"],
      settings: { foreground: "#1d56b8" },
    },
    {
      scope: ["variable.other.property", "meta.object-literal.key", "support.type.property-name"],
      settings: { foreground: "#2c3540" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "#6b7685" },
    },
    {
      scope: ["markup.deleted", "meta.diff.header.from-file"],
      settings: { foreground: "#b83227" },
    },
    {
      scope: ["markup.inserted", "meta.diff.header.to-file"],
      settings: { foreground: "#0c7559" },
    },
  ],
};
