// Keyword -> category-slug hints for receipt OCR text. Slugs must match
// DEFAULT_EXPENSE_CATEGORIES in ./defaultExpenseCategories.js. Deliberately never maps
// anything to "other" — that is the user's fallback choice, not a detection.
export const RECEIPT_CATEGORY_KEYWORDS = [
  {
    slug: "food-groceries",
    patterns: [
      /\b(restaurant|cafe|coffee|bakery|grocer(?:y|ies)|super\s*shop|superstore|mart|food|pizza|burger|kitchen|biryani|meat|vegetable|shwapno|agora|meena\s*bazar|unimart|foodpanda)\b/i,
    ],
  },
  {
    slug: "transport",
    patterns: [
      /\b(uber|pathao|obhai|taxi|cab|fuel|petrol|octane|diesel|cng|filling\s*station|bus|train|railway|metro|toll|parking|rickshaw|shohoz)\b/i,
    ],
  },
  {
    slug: "housing",
    patterns: [/\b(rent|lease|apartment|flat|service\s*charge|maintenance\s*fee)\b/i],
  },
  {
    slug: "utilities",
    patterns: [
      /\b(electric(?:ity)?|desco|dpdc|nesco|wasa|titas|gas\s*bill|water\s*bill|internet|broadband|isp|utility|link3|amber\s*it)\b/i,
    ],
  },
  {
    slug: "entertainment",
    patterns: [/\b(cinema|cineplex|movie|theatre|netflix|spotify|game|concert|ticket)\b/i],
  },
  {
    slug: "shopping",
    patterns: [
      /\b(daraz|amazon|aliexpress|apparel|fashion|clothing|garment|electronics|star\s*tech|ryans|techland|computer\s*source)\b/i,
    ],
  },
  {
    slug: "health",
    patterns: [/\b(pharmac(?:y|ie)|pharma|medicine|hospital|clinic|diagnostic|lazz|labaid|doctor|dental|optic)\b/i],
  },
  {
    slug: "education",
    patterns: [/\b(tuition|course|udemy|coursera|book\s*shop|library|school|college|university|exam\s*fee)\b/i],
  },
  {
    slug: "travel",
    patterns: [
      /\b(hotel|resort|airline|air\s*ticket|biman|emirates|us-?bangla|novoair|boarding\s*pass|flight|agoda|booking\.com|airbnb)\b/i,
    ],
  },
  {
    slug: "software-subscriptions",
    patterns: [
      /\b(subscription|saas|licen[cs]e|adobe|github|figma|notion|slack|jetbrains|aws|azure|google\s*(?:cloud|workspace|one)|microsoft\s*365|openai|domain|hosting|namecheap|godaddy|vercel|netlify)\b/i,
    ],
  },
  {
    slug: "personal-care",
    patterns: [/\b(salon|parlour|barber|spa|cosmetic|skincare|grooming)\b/i],
  },
];
