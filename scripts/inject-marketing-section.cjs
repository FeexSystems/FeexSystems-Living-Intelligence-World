const fs = require("fs");
const path = require("path");

const indexPath = path.resolve(__dirname, "../client/pages/Index.tsx");
let c = fs.readFileSync(indexPath, "utf8");

// 1. Add import
if (!c.includes("MarketingIntelligenceSection")) {
  c = c.replace(
    'import { LutPipelineCanvas } from "@/components/LutPipelineCanvas";',
    'import { LutPipelineCanvas } from "@/components/LutPipelineCanvas";\r\nimport { MarketingIntelligenceSection } from "@/components/marketing/MarketingIntelligenceSection";'
  );
}

// 2. Insert section after section 07
const targetComment = "{/* SECTION // 08 — ENTERPRISE READINESS";
const newSectionCode = `{/* ========================================================================= */}
        {/* SECTION // 08 — ADVANCED MARKETING INTELLIGENCE                           */}
        {/* ========================================================================= */}
        <MarketingIntelligenceSection />

        {/* ========================================================================= */}
        {/* SECTION // 09 — ENTERPRISE READINESS`;

if (c.includes(targetComment)) {
  // Find the separator before SECTION // 08
  const separator = "{/* ========================================================================= */}";
  const pos = c.indexOf(targetComment);
  const sepPos = c.lastIndexOf(separator, pos);
  if (sepPos !== -1) {
    c = c.slice(0, sepPos) + newSectionCode + c.slice(pos + targetComment.length);
  } else {
    c = c.replace(targetComment, newSectionCode);
  }
}

// 3. Renumber remaining section tags
c = c.replace("// 08 ENTERPRISE READINESS", "// 09 ENTERPRISE READINESS");
c = c.replace("SECTION // 09 — PRICING", "SECTION // 10 — PRICING");
c = c.replace("// 09 PRICING", "// 10 PRICING");
c = c.replace("SECTION // 10 — FREQUENTLY ASKED QUESTIONS", "SECTION // 11 — FREQUENTLY ASKED QUESTIONS");
c = c.replace("// 10 FREQUENTLY ASKED QUESTIONS", "// 11 FREQUENTLY ASKED QUESTIONS");
c = c.replace("SECTION // 11 — FINAL CLOSING CONVERSION STAGE", "SECTION // 12 — FINAL CLOSING CONVERSION STAGE");

fs.writeFileSync(indexPath, c, "utf8");
console.log("Index.tsx successfully updated with MarketingIntelligenceSection");
