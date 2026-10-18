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

async function getErrorMessage(response) {
  try {
    const body = await response.json();
    return body.message || "تعذر الاتصال بالخادم.";
  } catch {
    return "تعذر الاتصال بالخادم.";
  }
}
