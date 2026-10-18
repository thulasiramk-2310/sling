// Worker timers aren't throttled in hidden documents, so this paces detection in the offscreen page.
setInterval(() => postMessage(0), 30)
