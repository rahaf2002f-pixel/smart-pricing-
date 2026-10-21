async function authRequest(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Smart-Pricing": "1" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("تعذر الاتصال بالخادم. تحقق من اتصالك ثم أعد المحاولة.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "تعذر إكمال طلب الحساب. أعد المحاولة.");
    error.errors = data.errors || {};
    error.status = response.status;
    if (response.status === 401 && path === "profile") window.dispatchEvent(new Event("sp-account-changed"));
    throw error;
  }
  return data;
}

export const getCurrentUser = () => authRequest("me");
export const registerAccount = (body) => authRequest("register", { method: "POST", body });
export const loginAccount = (body) => authRequest("login", { method: "POST", body });
export const logoutAccount = () => authRequest("logout", { method: "POST" });
export const updateAccount = (body) => authRequest("profile", { method: "PATCH", body });
