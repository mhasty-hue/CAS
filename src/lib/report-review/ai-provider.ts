import type { AiReviewProvider, AiReviewProviderResult } from "@/types/report-review";

export const disabledAiReviewProvider: AiReviewProvider = {
  id: "disabled",
  label: "AI review provider disabled",
  analyze(): AiReviewProviderResult {
    return {
      enabled: false,
      status: "disabled",
      findings: [],
      message: "AI-assisted report review is disabled. CAS ran only deterministic checks for this report."
    };
  }
};

export function resolveAiReviewProvider() {
  return disabledAiReviewProvider;
}
