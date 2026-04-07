import { z } from "zod";

export default z.object({
  title: z.string().describe("The exact page title from the company website"),
  tagline: z.string().describe("The main hero or tagline text visible on the homepage"),
  reasoning: z.string().describe("Brief explanation of how you determined the tagline"),
});
