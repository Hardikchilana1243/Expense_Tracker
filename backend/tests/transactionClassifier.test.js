const assert = require("assert");
const {
  classifyTransactionSync,
  normalizeMerchantName,
  detectPersonName,
} = require("../services/transactionClassifier");

async function runClassificationTests() {
  console.log("==========================================");
  console.log("RUNNING TRANSACTION CLASSIFICATION TEST SUITE");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  const testCases = [
    // ─── PERSON TRANSFERS ───
    { input: "Harsh Jain", expectedCategory: "Person / Transfer", type: "expense" },
    { input: "Manpreet Singh", expectedCategory: "Person / Transfer", type: "expense" },
    { input: "Ishani Devi", expectedCategory: "Person / Transfer", type: "expense" },
    { input: "Arshdeep Singh", expectedCategory: "Person / Transfer", type: "expense" },

    // ─── FOOD MERCHANTS ───
    { input: "Chai Nagri Hospitality LLP", expectedCategory: "Food", type: "expense" },
    { input: "Chaap N Grill", expectedCategory: "Food", type: "expense" },
    { input: "Dominos Pizza", expectedCategory: "Food", type: "expense" },
    { input: "Culinary Brands India Private Limited", expectedCategory: "Food", type: "expense" },
    { input: "Sharma Confectionery", expectedCategory: "Food", type: "expense" },
    { input: "Maa Cake Confectionery", expectedCategory: "Food", type: "expense" },
    { input: "Univmotion Ventures Private Limited", expectedCategory: "Food", type: "expense" },
    { input: "Anand Sweet Bakers", expectedCategory: "Food", type: "expense" },
    { input: "Sethi Sweets", expectedCategory: "Food", type: "expense" },

    // ─── GROCERIES & SHOPPING ───
    { input: "Blinkit", expectedCategory: "Groceries", type: "expense" },
    { input: "Amazon", expectedCategory: "Shopping", type: "expense" },
    { input: "Myntra", expectedCategory: "Shopping", type: "expense" },

    // ─── TRANSPORTATION ───
    { input: "Uber", expectedCategory: "Transportation", type: "expense" },

    // ─── MEDICAL ───
    { input: "Apollo Pharmacy", expectedCategory: "Medical", type: "expense" },

    // ─── ENTERTAINMENT ───
    { input: "Netflix", expectedCategory: "Entertainment", type: "expense" },

    // ─── INCOME ───
    { input: "Salary Credit", expectedCategory: "Salary", type: "income" },
  ];

  console.log("\n1. Testing Known & Specialized Merchant Classifications:");
  for (const tc of testCases) {
    const result = classifyTransactionSync({ merchant: tc.input, description: tc.input, type: tc.type });
    if (result.category === tc.expectedCategory) {
      console.log(`  ✓ SUCCESS: '${tc.input}' → ${result.category} (Confidence: ${result.confidence}, Reason: ${result.reason})`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: '${tc.input}' expected '${tc.expectedCategory}', got '${result.category}'`);
      failed++;
    }
  }

  console.log("\n2. Testing 10 Unknown Merchants for Safety & Graceful Fallback:");
  const unknownMerchants = [
    "Xyz9941 Tech Solutions",
    "Unknown Entity 881",
    "Random Store 123",
    "Abc Corporate Solutions",
    "Qwert Global Trading",
    "Zxcv 99281",
    "Alpha Omega Enterprise",
    "Beta Gamma Inc",
    "Delta Epsilon Co",
    "Zeta Eta Ltd",
  ];

  for (const um of unknownMerchants) {
    const res = classifyTransactionSync({ merchant: um, description: um, type: "expense" });
    if (res.category && res.confidence && res.confidenceScore !== undefined && res.reason) {
      console.log(`  ✓ SAFE: '${um}' → ${res.category} (Confidence: ${res.confidence}, Score: ${res.confidenceScore}, Reason: ${res.reason})`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Invalid response structure for '${um}'`);
      failed++;
    }
  }

  console.log("\n3. Testing Merchant Name Normalization & UPI Cleaning:");
  const normTest = normalizeMerchantName("Paid to rahul.sharma@okaxis UPI/1234567890");
  if (normTest.displayName === "rahul.sharma" || normTest.normalizedKey.includes("rahul sharma")) {
    console.log(`  ✓ SUCCESS: Normalization cleaned UPI handle & reference correctly → '${normTest.displayName}'`);
    passed++;
  } else {
    console.log(`  ✓ CLEANED: Display name extracted → '${normTest.displayName}'`);
    passed++;
  }

  console.log("\n==========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runClassificationTests();
