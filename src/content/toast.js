function showToast(message, type = "info") {
  try {
    let container = document.getElementById("__translator_toast_container");
    if (!container) {
      container = document.createElement("div");
      container.id = "__translator_toast_container";
      container.style.position = "fixed";
      container.style.top = "12px";
      container.style.right = "14px";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";
      container.style.zIndex = 2147483647;
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "__translator_toast";

    // Set icon and background color based on type
    let icon = "ℹ️";
    let background = "#3b82f6";

    if (type === "save") {
      icon = "💾";
      background = "#16a34a";
    } else if (type === "loading") {
      icon = "⏳";
      background = "#5d2881ff";
    } else if (type === "error") {
      icon = "⚠️";
      background = "#dc2626";
    }

    toast.textContent = icon + " " + message;
    toast.style.background = background;
    toast.style.whiteSpace = "pre";
    toast.style.color = "#fff";
    toast.style.padding = "8px 14px";
    toast.style.fontSize = "13px";
    toast.style.lineHeight = "1.3";
    toast.style.borderRadius = "6px";
    toast.style.boxShadow = "0 4px 14px rgba(0,0,0,0.25)";
    toast.style.fontFamily =
      "system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    toast.style.transition = "opacity .25s ease, transform .25s ease";
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => {
        toast.remove();
        if (!container.childElementCount) container.remove();
      }, 300);
    }, 2600);
  } catch (err) {
    console.warn("Failed to show toast:", err);
  }
}

export function showSaveToast(message) {
  showToast(message, "save");
}

export function showLoadingToast(message) {
  showToast(message, "loading");
}

export function showInfoToast(message) {
  showToast(message, "info");
}
