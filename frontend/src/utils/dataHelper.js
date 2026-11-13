export function getCountdownInfo(deadlineDate) {
  if (!deadlineDate) return { text: "No Deadline", statusClass: "normal" };

  const now = new Date().getTime();
  const target = new Date(deadlineDate).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { text: "⚠️ Deadline Passed", statusClass: "expired", daysLeft: 0 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days === 0) {
    return { text: `🔥 Due Today (${hours}h left)`, statusClass: "urgent", daysLeft: 0 };
  }

  if (days <= 3) {
    return { text: `⚠️ ${days} Day${days > 1 ? "s" : ""} Left - Due Soon`, statusClass: "urgent", daysLeft: days };
  }

  return { text: `⏱ ${days} Days Remaining`, statusClass: "normal", daysLeft: days };
}