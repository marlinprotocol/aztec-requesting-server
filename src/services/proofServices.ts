import config from "../config.json";

export async function requestProofDirectly(
  input_da_identifier: string,
): Promise<string> {
  const id_da_uint8_array = Array.from(
    new Uint8Array(Buffer.from(input_da_identifier)),
  );
  const response = await fetch(config.proofServiceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public: id_da_uint8_array }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const responseData: { proof: Uint8Array } = await response.json();
  return convertToId(responseData.proof);
}

function convertToId(publicUint8Array: Uint8Array): string {
  return Buffer.from(publicUint8Array).toString();
}
