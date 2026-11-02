function formatBadge(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value - 1) < 0.001) return "";
  return value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (message?.type !== "RATE_CHANGED" || tabId == null) return;

  chrome.action.setBadgeText({
    tabId,
    text: formatBadge(message.rate),
  });
  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: "#2563eb",
  });
});
