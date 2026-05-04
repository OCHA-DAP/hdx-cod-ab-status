export function statusClass(status: string): string {
  if (status === "done") return "s-done";
  if (status === "in_progress") return "s-in_progress";
  if (status === "blocked") return "s-blocked";
  if (status === "selected") return "s-selected";
  if (status === "backlog") return "s-backlog";
  if (status === "cancelled") return "s-cancelled";
  return "s-none";
}

export const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  in_progress: "In Progress",
  blocked: "Blocked",
  selected: "Selected for Development",
  backlog: "Backlog",
  cancelled: "Cancelled",
};

export const STATUS_ORDER = ["backlog", "selected", "in_progress", "blocked", "done", "cancelled"];

export function statusRank(status: string): number {
  if (status === "blocked") return 0;
  if (status === "in_progress") return 1;
  if (status === "selected") return 2;
  if (status === "backlog") return 3;
  if (status === "done") return 4;
  if (status === "cancelled") return 5;
  return 6;
}

export const STATUS_TERMS: Record<string, string> = {
  done: "status-done",
  in_progress: "status-in_progress",
  blocked: "status-blocked",
  selected: "status-selected",
  backlog: "status-backlog",
  cancelled: "status-cancelled",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
