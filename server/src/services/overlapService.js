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
    const matched = [
      {
        key: "writing",
        patterns: ["write", "content", "copy", "draft", "blog", "story"],
      },
      {
        key: "chat",
        patterns: ["chat", "assistant", "conversational", "dialogue"],
      },
      {
        key: "image generation",
        patterns: ["image", "visual", "picture", "illustration", "design", "art"],
      },
      {
        key: "api access",
        patterns: ["api", "integration", "endpoint", "developer"],
      },
      {
        key: "automation",
        patterns: ["automate", "automation", "workflow", "process"],
      },
      {
        key: "analytics",
        patterns: ["analytics", "report", "data", "insight", "tracking"],
      },
      {
        key: "collaboration",
        patterns: ["team", "collaborate", "shared", "workspace"],
      },
      {
        key: "translation",
        patterns: ["translate", "translation", "language", "localize"],
      },
      {
        key: "code assistance",
        patterns: ["code", "developer", "programming", "debug", "syntax"],
      },
      {
        key: "security",
        patterns: ["security", "privacy", "encrypt", "auth", "compliance"],
      },
    ].find((entry) =>
      entry.patterns.some((pattern) => cap.includes(pattern))
    );

    return matched ? matched.key : cap;
  });
}

export function buildOverlapGroups(subs) {
  const capabilityBuckets = new Map();
  subs.forEach((sub) => {
    normalizeCapabilities(sub.capabilities).forEach((capability) => {
      if (!capabilityBuckets.has(capability)) capabilityBuckets.set(capability, []);
      capabilityBuckets.get(capability).push(sub);
    });
  });

  const groupsByMembers = new Map();
  capabilityBuckets.forEach((subscriptions, capability) => {
    if (subscriptions.length < 2) return;
    const key = subscriptions.map((sub) => sub._id.toString()).sort().join(":");
    if (!groupsByMembers.has(key)) {
      groupsByMembers.set(key, { subscriptions, sharedCapabilities: [] });
    }
    groupsByMembers.get(key).sharedCapabilities.push(capability);
  });

  const strongestGroup = Array.from(groupsByMembers.values()).sort(
    (a, b) => b.subscriptions.length - a.subscriptions.length
      || b.sharedCapabilities.length - a.sharedCapabilities.length
  )[0];

  return strongestGroup ? [{
    ...strongestGroup,
    requiresAmountMatch: false,
    detectionRule: "strongest_shared_capability",
  }] : [];
}
