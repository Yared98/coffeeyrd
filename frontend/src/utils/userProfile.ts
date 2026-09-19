const YRD_GLOBAL_KEY = 'yrd_profile_name';
const COFFEE_LOCAL_KEY = 'coffeeyrd_user_name';

export function getUserProfileName(): string {
  try {
    const globalName = localStorage.getItem(YRD_GLOBAL_KEY);
    if (globalName && globalName.trim()) return globalName.trim();
    const localName = localStorage.getItem(COFFEE_LOCAL_KEY);
    if (localName && localName.trim()) return localName.trim();
  } catch {
    // localStorage pode estar restrito em alguns ambientes
  }
  return '';
}

export function saveUserProfileName(name: string): void {
  const clean = name.trim();
  try {
    if (clean) {
      localStorage.setItem(YRD_GLOBAL_KEY, clean);
      localStorage.setItem(COFFEE_LOCAL_KEY, clean);
    } else {
      localStorage.removeItem(COFFEE_LOCAL_KEY);
    }
  } catch {
    // falha silenciosa de localStorage
  }
}
