const STORAGE_KEY = "local.sidebar-labels.v1";
const SYMBOLS = ["●", "★", "⚑", "◆", "■", "▲", "♥", "✓", "!", "?"];
const COLORS = ["#e45b50", "#e58b35", "#c59a19", "#47a66c", "#269da5", "#4385d8", "#8e6cce", "#ce679c", "#87909a"];
let observer, frame, popup, style;
let labels = {};
let mounted = false;
const folderBindings = new Map();

function readLabels() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch { return {}; }
}

function closePicker() {
  popup?.remove();
  popup = null;
}

function save(key, value) {
  const next = readLabels();
  if (value) next[key] = value;
  else delete next[key];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { alert("标记保存失败，请检查本机存储空间。"); return; }
  labels = next;
  paint();
}

function button(text, label, click) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.setAttribute("aria-label", label);
  element.title = label;
  element.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    click();
  });
  return element;
}

function openPicker(anchor, key, project) {
  closePicker();
  const previousFocus = document.activeElement;
  popup = document.createElement("div");
  popup.className = "sl-picker";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", project ? "项目文件夹颜色" : "会话标记");
  const heading = document.createElement("div");
  heading.className = "sl-heading";
  heading.textContent = project ? "文件夹颜色" : "会话标记";
  popup.append(heading);
  let choice = { symbol: "●", color: COLORS[5], ...labels[key] };
  const refresh = () => {
    for (const node of popup.querySelectorAll("[data-symbol]"))
      node.setAttribute("aria-pressed", String(node.dataset.symbol === choice.symbol));
    for (const node of popup.querySelectorAll("[data-color]"))
      node.setAttribute("aria-pressed", String(node.dataset.color === choice.color));
  };
  if (!project) {
    const grid = document.createElement("div");
    grid.className = "sl-symbols";
    for (const symbol of SYMBOLS) {
      const node = button(symbol, "符号 " + symbol, () => {
        choice.symbol = symbol;
        save(key, choice);
        refresh();
      });
      node.dataset.symbol = symbol;
      grid.append(node);
    }
    popup.append(grid);
  }
  const grid = document.createElement("div");
  grid.className = "sl-colors";
  for (const color of COLORS) {
    const node = button("●", "颜色 " + color, () => {
      choice.color = color;
      save(key, choice);
      refresh();
    });
    node.style.color = color;
    node.dataset.color = color;
    grid.append(node);
  }
  popup.append(grid);
  const customLabel = document.createElement("label");
  customLabel.className = "sl-custom";
  customLabel.append(document.createTextNode("自定义颜色"));
  const custom = document.createElement("input");
  custom.type = "color";
  custom.value = /^#[0-9a-f]{6}$/i.test(choice.color) ? choice.color : COLORS[5];
  custom.addEventListener("input", () => {
    choice.color = custom.value;
    save(key, choice);
    refresh();
  });
  customLabel.append(custom);
  popup.append(customLabel);
  const footer = document.createElement("div");
  footer.className = "sl-footer";
  footer.append(
    button("清除标记", "恢复默认外观", () => { save(key, null); closePicker(); anchor.focus(); }),
    button("完成", "关闭选择器", () => { closePicker(); anchor.focus(); })
  );
  popup.append(footer);
  popup.addEventListener("click", event => event.stopPropagation());
  popup.addEventListener("keydown", event => {
    if (event.key === "Escape") { closePicker(); previousFocus?.focus(); }
    if (event.key === "Tab") {
      const items = [...popup.querySelectorAll("button,input")];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.body.append(popup);
  const rect = anchor.getBoundingClientRect();
  popup.style.left = Math.max(8, Math.min(rect.left, innerWidth - 256)) + "px";
  popup.style.top = Math.max(8, Math.min(rect.bottom + 6, innerHeight - popup.offsetHeight - 8)) + "px";
  refresh();
  popup.querySelector("button")?.focus();
}

function decorate(row, key, project) {
  const main = project
    ? row.querySelector(".sidebar-session-group-header")
    : row.querySelector(".thread-item-main");
  if (!main) return;
  if (project) {
    const icon = main.querySelector(".project-toggle > svg:not(.sidebar-disclosure-icon):not(.sidebar-project-pin)");
    if (!icon) return;
    const color = /^#[0-9a-f]{6}$/i.test(labels[key]?.color || "") ? labels[key].color : "";
    icon.classList.add("sl-folder");
    row.style.setProperty("--sl-folder-color", color);
    if (!folderBindings.has(icon)) {
      const handler = event => {
        event.preventDefault();
        event.stopPropagation();
        openPicker(icon, key, true);
      };
      icon.setAttribute("role", "button");
      icon.setAttribute("tabindex", "0");
      icon.setAttribute("aria-label", "设置项目文件夹颜色");
      icon.addEventListener("click", handler);
      const keyHandler = event => {
        if (event.key === "Enter" || event.key === " ") handler(event);
      };
      icon.addEventListener("keydown", keyHandler);
      folderBindings.set(icon, {handler, keyHandler});
    }
    return;
  }
  let marker = main.querySelector(":scope > .sl-marker");
  if (!marker) {
    marker = button("", "", () => openPicker(marker, marker.dataset.key, project));
    marker.className = "sl-marker";
    main.prepend(marker);
  }
  marker.dataset.key = key;
  const value = labels[key];
  const label = project ? "设置项目文件夹颜色" : "设置会话符号和颜色";
  if (marker.getAttribute("aria-label") !== label) {
    marker.setAttribute("aria-label", label);
    marker.title = label;
  }
  const symbol = project ? "◉" : value?.symbol || "·";
  if (marker.textContent !== symbol) marker.textContent = symbol;
  const color = /^#[0-9a-f]{6}$/i.test(value?.color || "") ? value.color : "";
  if (marker.dataset.marked !== String(Boolean(value))) marker.dataset.marked = String(Boolean(value));
  if (marker.style.color !== color) marker.style.color = color;
  if (project) {
    const icon = main.querySelector(".project-toggle > svg:not(.sidebar-disclosure-icon):not(.sidebar-project-pin)");
    if (icon) {
      icon.classList.add("sl-folder");
      const current = row.style.getPropertyValue("--sl-folder-color");
      if (current !== color) row.style.setProperty("--sl-folder-color", color);
    }
  }
}

function paint() {
  if (!mounted) return;
  observer?.disconnect();
  for (const row of document.querySelectorAll("[data-sidebar-session-row]"))
    decorate(row, "session:" + row.dataset.sidebarSessionRow, false);
  for (const row of document.querySelectorAll("[data-sidebar-project-group]"))
    decorate(row, "project:" + row.dataset.sidebarProjectGroup, true);
  observer?.observe(document.body, { childList: true, subtree: true });
}

function schedulePaint() {
  if (!frame) frame = requestAnimationFrame(() => { frame = null; paint(); });
}
function outside(event) { if (popup && !popup.contains(event.target) && !event.target.closest(".sl-marker")) closePicker(); }
function changed(event) { if (event.key === STORAGE_KEY) { labels = readLabels(); schedulePaint(); } }

export function onLoad() {
  if (mounted) return;
  mounted = true;
  labels = readLabels();
  style = document.createElement("style");
  style.textContent = `
.sl-marker{flex:0 0 20px;width:20px;height:24px;margin-right:4px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--ds-text-tertiary,#999);font-size:15px;line-height:1;cursor:pointer}
.sl-marker:hover,.sl-marker:focus-visible{background:var(--ds-bg-hover,rgba(128,128,128,.15));outline:1px solid currentColor}
.sl-marker[data-marked="false"]{opacity:.4}
[data-sidebar-project-group] .sl-marker{width:16px;flex-basis:16px;font-size:12px}
[data-sidebar-project-group] .sl-folder{color:var(--sl-folder-color,inherit);cursor:pointer;pointer-events:auto}
.sl-picker{position:fixed;z-index:2147483000;width:240px;padding:12px;background:var(--ds-bg-elevated,var(--ds-bg-primary,#fff));color:var(--ds-text-primary,#222);border:1px solid var(--ds-border,rgba(128,128,128,.3));border-radius:12px;box-shadow:0 8px 32px #0003;font:13px system-ui}
.sl-heading{font-weight:600;margin-bottom:10px}
.sl-symbols,.sl-colors{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:10px}
.sl-picker button{min-height:30px;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;cursor:pointer;font:inherit}
.sl-symbols button{font-size:19px}.sl-colors button{font-size:24px}
.sl-picker button:hover{background:rgba(128,128,128,.13)}
.sl-picker button[aria-pressed="true"]{border-color:currentColor;background:rgba(128,128,128,.1)}
.sl-custom{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0}
.sl-custom input{width:38px;height:28px;border:0;padding:0;background:transparent}
.sl-footer{display:flex;justify-content:space-between;border-top:1px solid #8883;padding-top:8px}
`;
  document.head.append(style);
  observer = new MutationObserver(schedulePaint);
  document.addEventListener("pointerdown", outside, true);
  window.addEventListener("storage", changed);
  paint();
}

export function onUnload() {
  mounted = false;
  observer?.disconnect();
  if (frame) cancelAnimationFrame(frame);
  frame = null;
  closePicker();
  document.removeEventListener("pointerdown", outside, true);
  window.removeEventListener("storage", changed);
  document.querySelectorAll(".sl-marker").forEach(node => node.remove());
  document.querySelectorAll(".sl-folder").forEach(node => node.classList.remove("sl-folder"));
  document.querySelectorAll("[data-sidebar-project-group]").forEach(node => node.style.removeProperty("--sl-folder-color"));
  for (const [icon, handlers] of folderBindings) {
    icon.removeEventListener("click", handlers.handler);
    icon.removeEventListener("keydown", handlers.keyHandler);
    icon.removeAttribute("role");
    icon.removeAttribute("tabindex");
    icon.removeAttribute("aria-label");
  }
  folderBindings.clear();
  style?.remove();
}
