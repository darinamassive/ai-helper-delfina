const slider = document.getElementById("rate-slider");
const valueEl = document.getElementById("rate-value");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");

function formatRate(rate) {
  return `${Number(rate).toFixed(2)}×`;
}

function showStatus(text, isError = false) {
  statusEl.hidden = !text;
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function setControlsEnabled(enabled) {
  slider.disabled = !enabled;
  resetBtn.disabled = !enabled;
}

function renderRate(rate) {
  const safe = Math.min(4, Math.max(0.1, Number(rate) || 1));
  slider.value = String(safe);
  valueEl.textContent = formatRate(safe);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function canInject(tab) {
  const url = tab?.url || "";
  return /^(https?|file):/.test(url);
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function applyRate(tabId, rate) {
  const response = await sendToTab(tabId, { type: "SET_RATE", rate });
  if (!response?.ok) {
    throw new Error(response?.error || "Не удалось изменить скорость");
  }
  renderRate(response.rate);
  showStatus(
    response.videoCount ? "" : "На странице пока нет видео. Скорость применится, когда оно появится."
  );
}

async function init() {
  const tab = await getActiveTab();
  if (!tab?.id || !canInject(tab)) {
    showStatus("На этой странице скорость видео изменить нельзя.", true);
    return;
  }

  try {
    const response = await sendToTab(tab.id, { type: "GET_RATE" });
    if (!response?.ok) {
      throw new Error(response?.error || "Нет ответа от страницы");
    }
    renderRate(response.rate);
    setControlsEnabled(true);
    showStatus(
      response.videoCount ? "" : "На странице пока нет видео. Скорость применится, когда оно появится."
    );
  } catch {
    showStatus("Не удалось подключиться к этой вкладке.", true);
    return;
  }

  slider.addEventListener("input", async () => {
    const rate = Number(slider.value);
    renderRate(rate);
    try {
      await applyRate(tab.id, rate);
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  resetBtn.addEventListener("click", async () => {
    try {
      await applyRate(tab.id, 1);
    } catch (error) {
      showStatus(error.message, true);
    }
  });
}

init();
