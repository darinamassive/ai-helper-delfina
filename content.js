(() => {
  if (window.__videoSpeedControl) {
    return;
  }

  const MIN_RATE = 0.1;
  const MAX_RATE = 4;
  let desiredRate = null;

  function clamp(rate) {
    const value = Number(rate);
    if (!Number.isFinite(value)) return 1;
    return Math.min(MAX_RATE, Math.max(MIN_RATE, value));
  }

  function videos() {
    return Array.from(document.querySelectorAll("video"));
  }

  function currentRate() {
    const list = videos();
    const playing = list.find((video) => !video.paused && !video.ended);
    const source = playing || list[0];
    if (source && Number.isFinite(source.playbackRate)) {
      return clamp(source.playbackRate);
    }
    return desiredRate ?? 1;
  }

  function applyRate(rate) {
    desiredRate = clamp(rate);
    for (const video of videos()) {
      video.playbackRate = desiredRate;
    }
    notifyBackground();
    return desiredRate;
  }

  function notifyBackground() {
    try {
      chrome.runtime.sendMessage({
        type: "RATE_CHANGED",
        rate: currentRate(),
        videoCount: videos().length,
      });
    } catch {
      // Popup or worker may be closed.
    }
  }

  function watchVideo(video) {
    if (video.dataset.videoSpeedBound === "1") return;
    video.dataset.videoSpeedBound = "1";
    if (desiredRate != null) {
      video.playbackRate = desiredRate;
    }
    video.addEventListener("ratechange", notifyBackground);
    video.addEventListener("play", () => {
      if (desiredRate != null) {
        video.playbackRate = desiredRate;
      }
      notifyBackground();
    });
    video.addEventListener("loadedmetadata", () => {
      if (desiredRate != null) {
        video.playbackRate = desiredRate;
      }
    });
  }

  function scan() {
    for (const video of videos()) {
      watchVideo(video);
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_RATE") {
      const list = videos();
      sendResponse({
        ok: true,
        rate: currentRate(),
        videoCount: list.length,
      });
      return;
    }

    if (message?.type === "SET_RATE") {
      const rate = applyRate(message.rate);
      sendResponse({
        ok: true,
        rate,
        videoCount: videos().length,
      });
    }
  });

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();

  window.__videoSpeedControl = true;
})();
