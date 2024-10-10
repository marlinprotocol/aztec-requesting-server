import config from "../config.json";

export async function storeDataInMarlinDa(payload: string): Promise<string> {
  const response = await fetch(config.marlinDaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const responseData: { id: string } = await response.json();
  return responseData.id;
}
