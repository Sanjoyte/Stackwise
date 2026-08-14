const MASTER_CAPABILITY_CATALOG = [
  {
    key: "writing",
    label: "Writing Assistance",
    patterns: ["write", "content", "copy", "draft", "blog", "story"],
  },
  {
    key: "chat",
    label: "Chat Assistance",
    patterns: ["chat", "assistant", "conversational", "dialogue"],
  },
  {
    key: "image generation",
    label: "Image Generation",
    patterns: ["image", "visual", "picture", "illustration", "design", "art"],
  },
  {
    key: "api access",
    label: "API Access",
    patterns: ["api", "integration", "endpoint", "developer"],
  },
  {
    key: "automation",
    label: "Workflow Automation",
    patterns: ["automate", "automation", "workflow", "process"],
  },
  {
    key: "analytics",
    label: "Analytics",
    patterns: ["analytics", "report", "data", "insight", "tracking"],
  },
  {
    key: "collaboration",
    label: "Collaboration",
    patterns: ["team", "collaborate", "shared", "workspace"],
  },
  {
    key: "translation",
    label: "Translation",
    patterns: ["translate", "translation", "language", "localize"],
  },
  {
    key: "code assistance",
    label: "Code Assistance",
    patterns: ["code", "developer", "programming", "debug", "syntax"],
  },
  {
    key: "security",
    label: "Security",
    patterns: ["security", "privacy", "encrypt", "auth", "compliance"],
  },
];

export const CAPABILITY_LABELS = MASTER_CAPABILITY_CATALOG.reduce((map, entry) => {
  map[entry.key] = entry.label;
  return map;
}, {});

export function normalizeCapabilities(caps = []) {
  const normalized = Array.from(
    new Set(
      (caps || [])
        .map((cap) => cap?.toString().trim())
        .filter(Boolean)
        .map((cap) => cap.toLowerCase())
    )
  );

  return normalized.map((cap) => {
    const matched = MASTER_CAPABILITY_CATALOG.find((entry) =>
      entry.patterns.some((pattern) => cap.includes(pattern))
    );

    return matched ? matched.key : cap;
  });
}

export function getCapabilityLabel(capability) {
  return CAPABILITY_LABELS[capability] || capability;
}
