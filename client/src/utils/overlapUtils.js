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

export function getSharedCapabilities(subA, subB) {
  const capsA = normalizeCapabilities(subA.capabilities);
  const capsB = normalizeCapabilities(subB.capabilities);
  return capsA.filter((value) => capsB.includes(value));
}

export function buildOverlapGroups(subs) {
  const adjacency = new Map();
  subs.forEach((sub) => adjacency.set(sub._id, new Set()));

  for (let i = 0; i < subs.length; i += 1) {
    for (let j = i + 1; j < subs.length; j += 1) {
      const shared = getSharedCapabilities(subs[i], subs[j]);
      const amountMatches = Number(subs[i].amount) === Number(subs[j].amount);

      if (shared.length > 0 && amountMatches) {
        adjacency.get(subs[i]._id).add(subs[j]._id);
        adjacency.get(subs[j]._id).add(subs[i]._id);
      }
    }
  }

  const groups = [];
  const visited = new Set();

  subs.forEach((sub) => {
    if (visited.has(sub._id)) return;

    const stack = [sub._id];
    const currentGroupIds = [];

    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;

      visited.add(id);
      currentGroupIds.push(id);

      const neighbors = adjacency.get(id) || new Set();
      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          stack.push(neighborId);
        }
      });
    }

    if (currentGroupIds.length > 1) {
      const groupSubscriptions = subs.filter((item) =>
        currentGroupIds.includes(item._id)
      );

      const commonCapabilities = groupSubscriptions
        .map((item) => normalizeCapabilities(item.capabilities))
        .reduce(
          (common, next) => common.filter((tag) => next.includes(tag)),
          normalizeCapabilities(groupSubscriptions[0].capabilities)
        );

      groups.push({
        subscriptions: groupSubscriptions,
        sharedCapabilities: Array.from(new Set(commonCapabilities)),
        requiresAmountMatch: true,
      });
    }
  });

  return groups;
}

export function getCapabilityLabel(capability) {
  return CAPABILITY_LABELS[capability] || capability;
}
