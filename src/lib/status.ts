export function statusClass(status: string): string {
  if (status === "published") return "s-published";
  if (status === "in_progress") return "s-progress";
  if (status === "awaiting_dataset") return "s-awaiting";
  if (status === "on_hold") return "s-hold";
  return "s-none";
}

export const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  in_progress: "In Progress",
  awaiting_dataset: "Awaiting Dataset",
  on_hold: "On Hold",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
