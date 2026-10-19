/** Only an explicit missing/invalid link is absence; service failures remain errors. */
export async function readPublicResult<T>(response: Response): Promise<T | null> {
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error("تعذّر التحقق الآن. أعد المحاولة.");
  return response.json() as Promise<T>;
}
