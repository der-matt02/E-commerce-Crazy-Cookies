interface ApiErrorShape {
  response?: { data?: { message?: string } };
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiErrorShape)?.response?.data?.message || fallback;
}
