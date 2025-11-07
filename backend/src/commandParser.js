export function interpretCommand({ text }) {
  const raw = text.toLowerCase();

  if (raw.includes("scroll down")) 
    return { action: "SCROLL_DOWN" };

  if (raw.includes("scroll up"))
    return { action: "SCROLL_UP" };

  if (raw.includes("read page"))
    return { action: "READ_PAGE" };

  if (raw.includes("read this"))
    return { action: "READ_SELECTION" };

  if (raw.includes("open first"))
    return { action: "OPEN_NTH", index: 1 };

  if (raw.includes("open second"))
    return { action: "OPEN_NTH", index: 2 };

  return { action: "UNKNOWN" };
}
