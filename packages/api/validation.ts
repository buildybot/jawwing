import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const EmailSchema = z.object({
  email: z.string().email("email must be a valid email address"),
});

export const VerifySchema = z.object({
  email: z.string().email("email must be a valid email address"),
  code: z.string().regex(/^\d{6}$/, "code must be exactly 6 digits"),
});

export const PostSchema = z.object({
  content: z
    .string()
    .min(1, "content is required")
    .max(300, "content must be 300 characters or fewer")
    .refine((s) => s.trim().length > 0, "content cannot be blank"),
  lat: z.number().min(-90, "lat must be >= -90").max(90, "lat must be <= 90"),
  lng: z.number().min(-180, "lng must be >= -180").max(180, "lng must be <= 180"),
  image_url: z.string().url("image_url must be a valid URL").optional(),
});

export const VoteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]).refine(
    (v) => v === 1 || v === -1,
    { message: "value must be 1 or -1" }
  ),
});

export const ReplySchema = z.object({
  content: z
    .string()
    .min(1, "content is required")
    .max(300, "content must be 300 characters or fewer")
    .refine((s) => s.trim().length > 0, "content cannot be blank"),
  parent_reply_id: z.string().optional(),
});

export const ReportSchema = z.object({
  post_id: z.string().min(1, "post_id is required"),
  reply_id: z.string().optional(),
  reason: z.string().min(1, "reason is required").max(500, "reason must be 500 characters or fewer"),
});

export const ModReviewSchema = z.object({
  post_id: z.string().min(1, "post_id is required"),
  action: z.enum(["approve", "remove", "escalate", "warn"]),
  rule_cited: z.string().min(1, "rule_cited is required"),
  reasoning: z.string().min(1, "reasoning is required").max(1000, "reasoning must be 1000 characters or fewer"),
});

// ─── Validate helper ──────────────────────────────────────────────────────────

export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T; error: null } | { success: false; data: null; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }
  const error = result.error.issues.map((e: { message: string }) => e.message).join("; ");
  return { success: false, data: null, error };
}
