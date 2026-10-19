export async function getCalculation(sessionId) {
  const response = await fetch(`/api/pricing/calculations/${sessionId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

export async function saveCalculation(sessionId, inputs) {
  const response = await fetch(`/api/pricing/calculations/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

export async function getProducts(sessionId) {
  const response = await fetch(`/api/pricing/products/${sessionId}`);
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const body = await response.json();
  return body.products;
}

export async function createProduct(sessionId, product) {
  const response = await fetch(`/api/pricing/products/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).product;
}

export async function updateProduct(sessionId, productId, product) {
  const response = await fetch(`/api/pricing/products/${sessionId}/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).product;
}

export async function deleteProduct(sessionId, productId) {
  const response = await fetch(`/api/pricing/products/${sessionId}/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

export async function getPricingSettings(sessionId) {
  const response = await fetch(`/api/pricing/settings/${sessionId}`);
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).settings;
}

export async function savePricingSettings(sessionId, settings) {
  const response = await fetch(`/api/pricing/settings/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()).settings;
}

export async function requestPricingAdvice(sessionId, product, discountPercent) {
  const response = await fetch(`/api/pricing/advice/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product, discountPercent }),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json();
}

async function getErrorMessage(response) {
  try {
    const body = await response.json();
    return body.message || "تعذر الاتصال بالخادم.";
  } catch {
    return "تعذر الاتصال بالخادم.";
  }
}
