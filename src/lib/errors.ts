import { isAxiosError } from 'axios'

export function extractApiError(err: unknown, fallback = 'Algo deu errado'): string {
  if (isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? fallback
  }
  return fallback
}
