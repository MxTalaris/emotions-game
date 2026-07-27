export type DataResource =
  | 'event-templates'
  | 'emotions-catalog'
  | 'personalities-catalog';

export async function loadData<T>(name: DataResource): Promise<T> {
  const res = await fetch(`/api/data/${name}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load ${name} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function saveData(name: DataResource, data: unknown): Promise<void> {
  const res = await fetch(`/api/data/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to save ${name} (${res.status})`);
  }
}

export async function uploadCardImage(
  cardId: string,
  file: File
): Promise<string> {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });

  const res = await fetch('/api/upload/card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardId,
      filename: file.name,
      contentBase64,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }
  return String(body.path);
}
