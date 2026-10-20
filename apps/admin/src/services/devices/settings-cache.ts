/** Cache curto do global de dispositivos (processo único do Admin). */
const TTL_MS = 5000;
let cached: { at: number; value: Promise<unknown> } | null = null;

export function getCachedDeviceSettings(load: () => Promise<unknown>, now = Date.now()) {
  if (cached && now - cached.at < TTL_MS) return cached.value;
  const value = load();
  cached = { at: now, value };
  // Falha de carga não fica em cache (próxima requisição tenta de novo).
  value.catch(() => {
    if (cached?.value === value) cached = null;
  });
  return value;
}

export function invalidateDeviceSettingsCache() {
  cached = null;
}

export const DEVICE_SETTINGS_CACHE_TTL_MS = TTL_MS;
