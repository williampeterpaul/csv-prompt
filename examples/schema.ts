import { z } from "zod";

export default z.object({
  company_name: z
    .string()
    .describe(
      "Infer the company name from the website URL and/or listed name of the account"
    ),
});
