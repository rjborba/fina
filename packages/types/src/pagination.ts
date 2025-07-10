import z from "zod";

export const createPaginationScheme = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    totalCount: z.number(),
    data: z.array(dataSchema),
  });
