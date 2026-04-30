export function statusClass(status: string): string {
  if (status === "published") return "s-published";
  if (status === "processing") return "s-progress";
  if (status === "feedback") return "s-awaiting";
  if (status === "initialized") return "s-initialized";
  if (status === "blocked") return "s-hold";
  return "s-none";
}

export const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  processing: "Processing",
  feedback: "Feedback",
  initialized: "Initialized",
  blocked: "Blocked",
};

export const STATUS_TERMS: Record<string, string> = {
  published: "status-published",
  processing: "status-processing",
  feedback: "status-feedback",
  initialized: "status-initialized",
  blocked: "status-blocked",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
