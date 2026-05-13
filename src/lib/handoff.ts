const HANDOFF_KEY = "mokgong_handoff";

interface HandoffData {
  url: string;
  name: string;
  type: string;
}

export function setHandoffFile(file: File): void {
  const url = URL.createObjectURL(file);
  const data: HandoffData = { url, name: file.name, type: file.type };
  sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(data));
}

export async function getHandoffFile(): Promise<File | null> {
  const raw = sessionStorage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  try {
    const data: HandoffData = JSON.parse(raw) as HandoffData;
    const res = await fetch(data.url);
    const blob = await res.blob();
    return new File([blob], data.name, { type: data.type });
  } catch {
    return null;
  }
}

export function clearHandoff(): void {
  const raw = sessionStorage.getItem(HANDOFF_KEY);
  if (raw) {
    try {
      const data: HandoffData = JSON.parse(raw) as HandoffData;
      URL.revokeObjectURL(data.url);
    } catch {
      // ignore
    }
  }
  sessionStorage.removeItem(HANDOFF_KEY);
}
