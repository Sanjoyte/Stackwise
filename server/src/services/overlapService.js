function normalizeCapabilities(caps = []) {
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

function getSharedCapabilities(subA, subB) {
  const capsA = normalizeCapabilities(subA.capabilities);
  const capsB = normalizeCapabilities(subB.capabilities);
  return capsA.filter((value) => capsB.includes(value));
}

export function buildOverlapGroups(subs) {
  const adjacency = new Map();
  subs.forEach((sub) => adjacency.set(sub._id.toString(), new Set()));

  for (let i = 0; i < subs.length; i += 1) {
    for (let j = i + 1; j < subs.length; j += 1) {
      const shared = getSharedCapabilities(subs[i], subs[j]);
      const amountMatches = Number(subs[i].amount) === Number(subs[j].amount);

      if (shared.length > 0 && amountMatches) {
        adjacency.get(subs[i]._id.toString()).add(subs[j]._id.toString());
        adjacency.get(subs[j]._id.toString()).add(subs[i]._id.toString());
      }
    }
  }

  const groups = [];
  const visited = new Set();

  subs.forEach((sub) => {
    const id = sub._id.toString();
    if (visited.has(id)) return;

    const stack = [id];
    const currentGroupIds = [];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      currentGroupIds.push(currentId);

      const neighbors = adjacency.get(currentId) || new Set();
      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          stack.push(neighborId);
        }
      });
    }

    if (currentGroupIds.length > 1) {
      const groupSubscriptions = subs.filter((item) =>
        currentGroupIds.includes(item._id.toString())
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
