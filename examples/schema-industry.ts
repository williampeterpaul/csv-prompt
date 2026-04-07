import { z } from "zod";

export default z.object({
  industry: z.string().describe("The primary industry of the company"),
  sub_industry: z.string().describe("A more specific sub-industry classification"),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence in the classification"),
});
