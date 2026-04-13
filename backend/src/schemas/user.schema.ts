import { z } from "zod";

const reservedNicknames = new Set(["admin", "support", "mathsheets"]);

export const updatePublicNicknameSchema = z.object({
  publicNickname: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9 _-]+$/, "Nickname can use letters, numbers, spaces, underscores, and hyphens only")
    .refine((value) => !reservedNicknames.has(value.toLowerCase()), {
      message: "Nickname is reserved"
    })
});
