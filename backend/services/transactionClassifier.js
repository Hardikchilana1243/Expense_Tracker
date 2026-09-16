const UserMerchantPreference = require("../models/UserMerchantPreference");

/**
 * Standard Canonical Categories
 */
const CANONICAL_CATEGORIES = [
  "Food",
  "Shopping",
  "Groceries",
  "Transportation",
  "Rent",
  "Utilities",
  "Medical",
  "Education",
  "Entertainment",
  "Travel",
  "Salary",
  "Freelance",
  "Cashback",
  "Refund",
  "Bills",
  "Person / Transfer",
  "Investment",
  "Other",
];

/**
 * Normalize legacy or UI category names (strips emojis and maps synonyms)
 */
const normalizeCategoryName = (categoryStr = "") => {
  if (!categoryStr || typeof categoryStr !== "string") return "Other";
  
  // Strip emojis and non-alphanumeric (keep spaces and slashes)
  const clean = categoryStr.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "").trim();
  
  const lower = clean.toLowerCase();
  if (lower.includes("food") || lower.includes("dining")) return "Food";
  if (lower.includes("grocery") || lower.includes("groceries")) return "Groceries";
  if (lower.includes("shopping") || lower.includes("clothes") || lower.includes("apparel")) return "Shopping";
  if (lower.includes("transport") || lower.includes("cab") || lower.includes("taxi")) return "Transportation";
  if (lower.includes("rent")) return "Rent";
  if (lower.includes("recharge") || lower.includes("utility") || lower.includes("utilities") || lower.includes("mobile")) return "Utilities";
  if (lower.includes("medical") || lower.includes("health")) return "Medical";
  if (lower.includes("education") || lower.includes("book") || lower.includes("course")) return "Education";
  if (lower.includes("entertainment") || lower.includes("movie") || lower.includes("game")) return "Entertainment";
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel")) return "Travel";
  if (lower.includes("salary")) return "Salary";
  if (lower.includes("freelance")) return "Freelance";
  if (lower.includes("cashback")) return "Cashback";
  if (lower.includes("refund")) return "Refund";
  if (lower.includes("bill")) return "Bills";
  if (lower.includes("person") || lower.includes("transfer") || lower.includes("p2p")) return "Person / Transfer";
  if (lower.includes("investment") || lower.includes("stock")) return "Investment";

  return CANONICAL_CATEGORIES.includes(clean) ? clean : "Other";
};

/**
 * Merchant Name Normalization
 * Returns original, cleaned display name, and normalized matching key
 */
const normalizeMerchantName = (rawText = "") => {
  if (!rawText || typeof rawText !== "string") {
    return { originalMerchant: "Unknown", displayName: "Unknown", normalizedKey: "" };
  }

  const originalMerchant = rawText.trim();
  let text = originalMerchant;

  // 1. Remove common payment prefixes
  text = text.replace(
    /^(paid to|payment to|sent to|paid|received from|credit from|received|upi payment to|money transfer to|transfer to|bill paid to|recharge for|order at|order on|purchased at)\s+/i,
    ""
  );

  // 2. Remove UPI handles (e.g. rahul@okaxis, merchant@ybl)
  text = text.replace(/\b[a-zA-Z0-9.\-_]+@(okaxis|ybl|paytm|icici|upi|sbi|axis|ibl|postbank|okhdfcbank)\b/gi, "").trim();

  // 3. Remove transaction/reference numbers (e.g. UPI/12345678, UTR: 98765432, TXN12345)
  text = text.replace(/\b(UPI|UTR|TXN|REF|ORDER|ID)[\/:\s\-]*[0-9a-zA-Z]+\b/gi, "").trim();
  text = text.replace(/\b[0-9]{9,}\b/g, "").trim();

  // 4. Clean extra spaces and punctuation
  text = text.replace(/^[\s\-_:]+|[\s\-_:]+$/g, "").trim();

  if (!text) {
    return { originalMerchant, displayName: originalMerchant || "Unknown", normalizedKey: "" };
  }

  // Display Name: preserve case & structure
  const displayName = text;

  // Normalized key for pattern matching (lowercase, no punctuation, strip corporate suffixes)
  let normalizedKey = text.toLowerCase();
  normalizedKey = normalizedKey.replace(/[^a-z0-9\s]/g, " "); // keep spaces
  normalizedKey = normalizedKey.replace(/\b(private limited|pvt ltd|llp|ltd|limited|inc|co|corp|corporation)\b/g, " ");
  normalizedKey = normalizedKey.replace(/\s+/g, " ").trim();

  return {
    originalMerchant,
    displayName,
    normalizedKey,
  };
};

/**
 * List of business/commercial indicators
 */
const BUSINESS_KEYWORDS = [
  "llp", "pvt", "private", "limited", "ltd", "inc", "co", "corp", "corporation",
  "ventures", "enterprises", "enterprise", "traders", "trading", "store", "shop",
  "hospitality", "retail", "confectionery", "restaurant", "cafe", "pharmacy", "hospital",
  "services", "solutions", "industries", "commerce", "infra", "tech", "digital", "labs",
  "creations", "international", "dhaba", "bakers", "kitchen", "mart", "bazar", "supermarket",
  "clinic", "diagnostic", "ott", "ecommerce", "studio", "fashion", "apparel", "sports", "gym",
  "cinema", "jewellers", "hardware", "mobiles", "telecom", "logistics", "grill", "canteen",
  "sweets", "chaap", "dth", "payments", "bank", "hotel", "resort", "academy", "institute",
  "college", "university", "school", "petrol", "pump", "agency", "company", "group", "holdings", "global"
];

/**
 * Person Detection Heuristic
 */
const detectPersonName = (normalizedKey = "", rawText = "") => {
  if (!normalizedKey) return { isPerson: false, score: 0, reason: "" };

  const lowerRaw = (rawText || "").toLowerCase();
  const rawWords = lowerRaw.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

  // Check if any business keyword is present in raw text words or normalized key words
  const hasBusinessKeyword = rawWords.some((w) => BUSINESS_KEYWORDS.includes(w));
  if (hasBusinessKeyword) {
    return { isPerson: false, score: 0, reason: "Contains commercial or business terminology" };
  }

  // Count digits in normalized key or raw text
  const digitCount = (lowerRaw.match(/\d/g) || []).length;
  if (digitCount > 0) {
    return { isPerson: false, score: 0, reason: "Contains numeric characters" };
  }

  const words = normalizedKey.split(/\s+/).filter(Boolean);

  // P2P prefix check ("Paid to Rahul Sharma", "Received from Amit Kumar")
  const hasP2PPrefix = /^(paid to|received from|sent to|money transfer to|transfer to)\s+/i.test(rawText);

  // Human name characteristics (2 to 4 words):
  if (words.length >= 2 && words.length <= 4) {
    const isAlpha = words.every((w) => /^[a-z]+$/i.test(w) && w.length >= 2);
    if (isAlpha) {
      return {
        isPerson: true,
        score: 0.90,
        reason: `Matched human proper name pattern (${words.length} words without business suffixes)`,
      };
    }
  }

  // Single word proper name or concatenated Indian name
  if (words.length === 1 && words[0].length >= 4) {
    const singleWord = words[0].toLowerCase();
    const hasNameSuffix = /(kumar|singh|sharma|sehgal|gaba|khatkar|kaushik|khatri|wadhwa|khera|pruthi|lohia|narula|sahota|asija|kakkar|singla|khan|pal|rani|gupta|verma|arora|bansal|bhatia)$/i.test(singleWord);
    if (hasNameSuffix || hasP2PPrefix) {
      return {
        isPerson: true,
        score: 0.85,
        reason: "Matched person name pattern or concatenated name with surname suffix",
      };
    }
  }

  return { isPerson: false, score: 0, reason: "Does not meet person name heuristics" };
};

/**
 * Known Merchant Knowledge Database
 * Priority rules for exact / pattern matching
 */
const KNOWN_MERCHANT_RULES = [
  // ─── CAMPUS / LOCAL VENDORS ───
  { pattern: /chai\s*nagri/i, category: "Food", priority: 100, reason: "Campus vendor: Chai Nagri Hospitality" },
  { pattern: /univmotion/i, category: "Food", priority: 100, reason: "Campus food service vendor: Univmotion Ventures" },
  { pattern: /parrave/i, category: "Food", priority: 100, reason: "Campus food vendor: Parrave Ventures" },
  { pattern: /sins\s*hospitality/i, category: "Food", priority: 100, reason: "Campus hospitality food service: Sins Hospitality" },
  { pattern: /ch\s*aap\s*n\s*grill|chaap\s*n\s*grill|chaapngrill/i, category: "Food", priority: 100, reason: "Food vendor: Chaap N Grill" },
  { pattern: /uengage|ufood/i, category: "Food", priority: 100, reason: "Campus food ordering platform: Uengage" },
  { pattern: /khalsa\s*kulcha|khalsakhulcha/i, category: "Food", priority: 100, reason: "Campus food vendor: Khalsa Kulcha" },
  { pattern: /anand\s*sweet|anandsweet/i, category: "Food", priority: 100, reason: "Food vendor: Anand Sweet Bakers" },
  { pattern: /sharma\s*confectionery/i, category: "Food", priority: 100, reason: "Food vendor: Sharma Confectionery" },
  { pattern: /maa\s*cake/i, category: "Food", priority: 100, reason: "Bakery/Food vendor: Maa Cake Confectionery" },
  { pattern: /sethi\s*sweets/i, category: "Food", priority: 100, reason: "Sweets vendor: Sethi Sweets" },
  { pattern: /tejay\s*dhaba/i, category: "Food", priority: 100, reason: "Restaurant vendor: New Tejay Dhaba" },
  { pattern: /culinary\s*brands/i, category: "Food", priority: 100, reason: "Food service vendor: Culinary Brands India" },
  { pattern: /dairy/i, category: "Food", priority: 85, reason: "Dairy food vendor" },

  // ─── TRAVEL & LODGING ───
  { pattern: /hotel|resort|mountainquail|tikkar\s*tal|lodge|homestay/i, category: "Travel", priority: 90, reason: "Hotel & travel lodging" },

  // ─── TRANSPORTATION ───
  { pattern: /filling\s*station|fillingstation|service\s*station|servicestation|petrol/i, category: "Transportation", priority: 90, reason: "Fuel & auto service station" },

  // ─── ENTERTAINMENT ───
  { pattern: /google\s*play|googleplay|playstore/i, category: "Entertainment", priority: 90, reason: "Digital media & app store: Google Play" },

  // ─── GROCERIES ───
  { pattern: /blinkit/i, category: "Groceries", priority: 95, reason: "Grocery quick-commerce: Blinkit" },
  { pattern: /zepto/i, category: "Groceries", priority: 95, reason: "Grocery quick-commerce: Zepto" },
  { pattern: /bigbasket/i, category: "Groceries", priority: 95, reason: "Grocery store: BigBasket" },
  { pattern: /instamart/i, category: "Groceries", priority: 95, reason: "Grocery service: Swiggy Instamart" },
  { pattern: /dmart/i, category: "Groceries", priority: 95, reason: "Supermarket chain: DMart" },
  { pattern: /milkbasket|country\s*delight/i, category: "Groceries", priority: 95, reason: "Daily dairy & grocery service" },

  // ─── FOOD & DINING ───
  { pattern: /swiggy/i, category: "Food", priority: 95, reason: "Food delivery: Swiggy" },
  { pattern: /zomato/i, category: "Food", priority: 95, reason: "Food delivery: Zomato" },
  { pattern: /domino|pizza\s*hut/i, category: "Food", priority: 95, reason: "Fast food chain" },
  { pattern: /starbucks|chaayos|chai\s*point/i, category: "Food", priority: 95, reason: "Cafe chain" },
  { pattern: /mcdonald|kfc|burger\s*king|subway/i, category: "Food", priority: 95, reason: "Fast food restaurant" },
  { pattern: /haldiram|bikaner/i, category: "Food", priority: 95, reason: "Restaurant & sweets" },

  // ─── SHOPPING ───
  { pattern: /yousta/i, category: "Shopping", priority: 95, reason: "Apparel store: Yousta" },
  { pattern: /amazon\s*pharmacy/i, category: "Medical", priority: 98, reason: "Online pharmacy: Amazon Pharmacy" },
  { pattern: /amazon/i, category: "Shopping", priority: 90, reason: "E-commerce platform: Amazon" },
  { pattern: /flipkart/i, category: "Shopping", priority: 90, reason: "E-commerce platform: Flipkart" },
  { pattern: /myntra|ajio|nykaa/i, category: "Shopping", priority: 90, reason: "Fashion & beauty retailer" },
  { pattern: /decathlon/i, category: "Shopping", priority: 90, reason: "Sports retail: Decathlon" },
  { pattern: /zara|h&m|uniqlo|trends|pantaloons|westside/i, category: "Shopping", priority: 90, reason: "Clothing & fashion store" },
  { pattern: /croma|reliance\s*digital|vijay\s*sales/i, category: "Shopping", priority: 90, reason: "Electronics retailer" },
  { pattern: /hyuga\s*ecommerce/i, category: "Shopping", priority: 90, reason: "Ecommerce vendor: Hyuga" },
  { pattern: /sehgal\s*enterprises|thrv\s*traders/i, category: "Shopping", priority: 85, reason: "Retail trader/enterprise" },

  // ─── TRANSPORTATION ───
  { pattern: /uber/i, category: "Transportation", priority: 95, reason: "Rideshare service: Uber" },
  { pattern: /ola\s*cabs|ola\s*fleet/i, category: "Transportation", priority: 95, reason: "Rideshare service: Ola" },
  { pattern: /rapido/i, category: "Transportation", priority: 95, reason: "Bike taxi service: Rapido" },
  { pattern: /irctc|indian\s*railway/i, category: "Transportation", priority: 95, reason: "Rail transport: IRCTC" },
  { pattern: /indianoil|indian\s*oil|hpcl|bpcl|shell\s*petrol/i, category: "Transportation", priority: 95, reason: "Fuel station" },
  { pattern: /fastag/i, category: "Transportation", priority: 95, reason: "Toll payment: Fastag" },
  { pattern: /metro\s*rail|namma\s*metro|delhi\s*metro/i, category: "Transportation", priority: 95, reason: "Transit metro" },

  // ─── MEDICAL ───
  { pattern: /apollo\s*pharmacy|apollo\s*hospital|apollo/i, category: "Medical", priority: 95, reason: "Healthcare provider: Apollo" },
  { pattern: /fortis|max\s*healthcare|manipal/i, category: "Medical", priority: 95, reason: "Hospital & healthcare provider" },
  { pattern: /medplus|pharmeasy|1mg|netmeds|truemeds/i, category: "Medical", priority: 95, reason: "Pharmacy & medicine delivery" },
  { pattern: /lal\s*pathlabs|metropolis|thyrocare/i, category: "Medical", priority: 95, reason: "Diagnostic lab" },

  // ─── ENTERTAINMENT ───
  { pattern: /netflix/i, category: "Entertainment", priority: 95, reason: "Streaming service: Netflix" },
  { pattern: /spotify/i, category: "Entertainment", priority: 95, reason: "Music streaming: Spotify" },
  { pattern: /bookmyshow/i, category: "Entertainment", priority: 95, reason: "Ticketing platform: BookMyShow" },
  { pattern: /hotstar|disney\+|prime\s*video|sonyliv|zee5/i, category: "Entertainment", priority: 95, reason: "Video streaming platform" },
  { pattern: /bullet\s*micro\s*drama|drama\s*ott/i, category: "Entertainment", priority: 95, reason: "OTT media service: Bullet Micro Drama" },
  { pattern: /pvr|inox|cinepolis/i, category: "Entertainment", priority: 95, reason: "Cinema theater" },

  // ─── UTILITIES & BILLS ───
  { pattern: /jio\s*recharge|jio\s*prepaid|jio\s*fiber/i, category: "Utilities", priority: 95, reason: "Telecom & broadband: Jio" },
  { pattern: /airtel\s*dth|airtel\s*recharge|airtel\s*broadband/i, category: "Utilities", priority: 95, reason: "Telecom & broadband: Airtel" },
  { pattern: /bescom|tata\s*power|adani\s*electricity|mahavitaran/i, category: "Utilities", priority: 95, reason: "Electricity utility provider" },
  { pattern: /indraprastha\s*gas|mgl|iglh/i, category: "Utilities", priority: 95, reason: "Gas utility provider" },
];

/**
 * Domain Generic Keyword Signals
 */
const DOMAIN_KEYWORDS = [
  { words: ["cafe", "coffee", "tea", "chai", "restaurant", "canteen", "mess", "bakery", "confectionery", "sweets", "dhaba", "bakers", "kitchen", "grill", "snack", "dessert", "icecream"], category: "Food", weight: 0.85, reason: "Food service & dining keyword signal" },
  { words: ["grocery", "supermarket", "hypermarket", "vegetable", "fruit", "mart", "bazar", "provision"], category: "Groceries", weight: 0.85, reason: "Grocery & market keyword signal" },
  { words: ["pharmacy", "chemist", "hospital", "clinic", "doctor", "medicine", "diagnostic", "lab", "dental"], category: "Medical", weight: 0.85, reason: "Medical & healthcare keyword signal" },
  { words: ["petrol", "diesel", "fuel", "cab", "taxi", "metro", "bus", "parking", "toll", "transit"], category: "Transportation", weight: 0.85, reason: "Transportation & transit keyword signal" },
  { words: ["movie", "cinema", "theatre", "gaming", "playstation", "steam", "concert", "ott"], category: "Entertainment", weight: 0.85, reason: "Entertainment keyword signal" },
  { words: ["university", "college", "school", "tuition", "coaching", "exam", "course", "stationery"], category: "Education", weight: 0.85, reason: "Education & learning keyword signal" },
  { words: ["fashion", "clothing", "apparel", "footwear", "shoes", "electronics", "boutique", "jeweller"], category: "Shopping", weight: 0.80, reason: "Shopping & retail keyword signal" },
  { words: ["electricity", "water", "broadband", "wifi", "recharge", "dth", "gas", "utility"], category: "Utilities", weight: 0.85, reason: "Utilities & bill keyword signal" },
  { words: ["rent", "landlord", "houserent"], category: "Rent", weight: 0.90, reason: "Housing rent keyword signal" },
];

/**
 * Centralized Transaction Classification Engine
 */
const classifyTransaction = async ({
  merchant = "",
  description = "",
  type = "expense",
  source = "manual",
  amount = 0,
  userId = null,
} = {}) => {
  const rawText = String(merchant || description || "").trim();
  const normalized = normalizeMerchantName(rawText);
  const { displayName, normalizedKey, originalMerchant } = normalized;

  if (!rawText || !normalizedKey) {
    return {
      category: type === "income" ? "Salary" : "Other",
      confidence: "low",
      confidenceScore: 0.40,
      reason: "Empty or invalid merchant input",
      isPerson: false,
      normalizedMerchant: "",
      originalMerchant,
    };
  }

  // ─── Priority 1: User-Specific Merchant Preference ───
  if (userId) {
    try {
      const userPref = await UserMerchantPreference.findOne({
        userId,
        merchantKey: normalizedKey,
      }).lean();

      if (userPref && userPref.category) {
        return {
          category: normalizeCategoryName(userPref.category),
          confidence: "high",
          confidenceScore: 1.00,
          reason: `Matched custom user preference for merchant '${normalizedKey}'`,
          isPerson: false,
          normalizedMerchant: normalizedKey,
          originalMerchant,
        };
      }
    } catch (err) {
      console.error("User preference lookup error:", err.message);
    }
  }

  // ─── Priority 2: Income specific checks ───
  if (type === "income") {
    const lowerKey = normalizedKey.toLowerCase();
    if (/salary|payroll|stipend|wages|salary credit/i.test(lowerKey)) {
      return {
        category: "Salary",
        confidence: "high",
        confidenceScore: 0.98,
        reason: "Matched salary/payroll income signals",
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
    if (/freelance|freelancer|invoice|client payment/i.test(lowerKey)) {
      return {
        category: "Freelance",
        confidence: "high",
        confidenceScore: 0.95,
        reason: "Matched freelance income signals",
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
    if (/cashback|reward/i.test(lowerKey)) {
      return {
        category: "Cashback",
        confidence: "high",
        confidenceScore: 0.95,
        reason: "Matched cashback/reward income signals",
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
    if (/refund|reversal/i.test(lowerKey)) {
      return {
        category: "Refund",
        confidence: "high",
        confidenceScore: 0.95,
        reason: "Matched refund income signals",
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
  }

  // ─── Priority 3: Known Merchant Rules Database ───
  for (const rule of KNOWN_MERCHANT_RULES) {
    if (rule.pattern.test(rawText) || rule.pattern.test(normalizedKey)) {
      return {
        category: rule.category,
        confidence: rule.priority >= 90 ? "high" : "medium",
        confidenceScore: rule.priority / 100,
        reason: rule.reason,
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
  }

  // ─── Priority 4: Person Detection Heuristics ───
  const personEval = detectPersonName(normalizedKey, rawText);
  if (personEval.isPerson && personEval.score >= 0.80) {
    return {
      category: "Person / Transfer",
      confidence: personEval.score >= 0.90 ? "high" : "medium",
      confidenceScore: personEval.score,
      reason: personEval.reason,
      isPerson: true,
      normalizedMerchant: normalizedKey,
      originalMerchant,
    };
  }

  // ─── Priority 5: Domain Keyword Signals ───
  for (const domain of DOMAIN_KEYWORDS) {
    const hasWord = domain.words.some((w) => normalizedKey.includes(w) || rawText.toLowerCase().includes(w));
    if (hasWord) {
      return {
        category: domain.category,
        confidence: domain.weight >= 0.85 ? "high" : "medium",
        confidenceScore: domain.weight,
        reason: domain.reason,
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
  }

  // ─── Priority 6: Fallback for Unknown Entities ───
  const fallbackCategory = type === "income" ? "Salary" : "Other";
  return {
    category: fallbackCategory,
    confidence: "low",
    confidenceScore: 0.45,
    reason: "Low confidence classification fallback",
    isPerson: false,
    normalizedMerchant: normalizedKey,
    originalMerchant,
  };
};

/**
 * Synchronous wrapper for CSV parsers and fast sync evaluation
 */
const classifyTransactionSync = (data = {}) => {
  const rawText = String(data.merchant || data.description || "").trim();
  const normalized = normalizeMerchantName(rawText);
  const { normalizedKey, originalMerchant } = normalized;
  const type = data.type || "expense";

  if (!rawText || !normalizedKey) {
    return {
      category: type === "income" ? "Salary" : "Other",
      confidence: "low",
      confidenceScore: 0.40,
      reason: "Empty or invalid merchant input",
      isPerson: false,
      normalizedMerchant: "",
      originalMerchant,
    };
  }

  if (type === "income") {
    const lowerKey = normalizedKey.toLowerCase();
    if (/salary|payroll|stipend|wages/i.test(lowerKey)) return { category: "Salary", confidence: "high", confidenceScore: 0.98, reason: "Matched salary signal" };
    if (/freelance|invoice/i.test(lowerKey)) return { category: "Freelance", confidence: "high", confidenceScore: 0.95, reason: "Matched freelance signal" };
    if (/cashback/i.test(lowerKey)) return { category: "Cashback", confidence: "high", confidenceScore: 0.95, reason: "Matched cashback signal" };
    if (/refund/i.test(lowerKey)) return { category: "Refund", confidence: "high", confidenceScore: 0.95, reason: "Matched refund signal" };
  }

  for (const rule of KNOWN_MERCHANT_RULES) {
    if (rule.pattern.test(rawText) || rule.pattern.test(normalizedKey)) {
      return {
        category: rule.category,
        confidence: rule.priority >= 90 ? "high" : "medium",
        confidenceScore: rule.priority / 100,
        reason: rule.reason,
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
  }

  const personEval = detectPersonName(normalizedKey, rawText);
  if (personEval.isPerson && personEval.score >= 0.80) {
    return {
      category: "Person / Transfer",
      confidence: personEval.score >= 0.90 ? "high" : "medium",
      confidenceScore: personEval.score,
      reason: personEval.reason,
      isPerson: true,
      normalizedMerchant: normalizedKey,
      originalMerchant,
    };
  }

  for (const domain of DOMAIN_KEYWORDS) {
    const hasWord = domain.words.some((w) => normalizedKey.includes(w) || rawText.toLowerCase().includes(w));
    if (hasWord) {
      return {
        category: domain.category,
        confidence: domain.weight >= 0.85 ? "high" : "medium",
        confidenceScore: domain.weight,
        reason: domain.reason,
        isPerson: false,
        normalizedMerchant: normalizedKey,
        originalMerchant,
      };
    }
  }

  return {
    category: type === "income" ? "Salary" : "Other",
    confidence: "low",
    confidenceScore: 0.45,
    reason: "Low confidence classification fallback",
    isPerson: false,
    normalizedMerchant: normalizedKey,
    originalMerchant,
  };
};

module.exports = {
  classifyTransaction,
  classifyTransactionSync,
  normalizeMerchantName,
  detectPersonName,
  normalizeCategoryName,
  CANONICAL_CATEGORIES,
};
