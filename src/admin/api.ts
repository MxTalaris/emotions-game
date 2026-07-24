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
