import type { z } from "zod";
import { t } from "@/lib/i18n/ar";

/** Shared result shape for form server actions driven by useActionState. */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export function fieldErrorsFromZod(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: undefined, fieldErrors };
}

export function unknownError(): FormState {
  return { error: t.common.error };
}
