export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Login local (email + contraseña). El parámetro returnPath se conserva por
// compatibilidad con los llamadores existentes.
export const getLoginUrl = (returnPath?: string) => {
  if (returnPath && returnPath !== "/") {
    return `/login?return=${encodeURIComponent(returnPath)}`;
  }
  return "/login";
};
