/**
 * Retries a promise-returning function with exponential backoff.
 * @param fn The function to retry.
 * @param retries Maximum number of retries.
 * @param delay Initial delay in ms.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.warn(`Attempt failed. Retrying in ${delay}ms...`, error);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withExponentialBackoff(fn, retries - 1, delay * 2);
  }
}