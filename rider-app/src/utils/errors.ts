import {AxiosError} from 'axios';
import {ApiErrorResponse} from '../types/rider';

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      const baseUrl = (error.config?.baseURL || '').trim();
      return baseUrl
        ? `Network error: unable to reach ${baseUrl}. Ensure backend is running and phone/emulator can access this host.`
        : 'Network error: unable to reach server. Ensure backend is running and API URL is correct.';
    }

    const payload = error.response?.data as ApiErrorResponse | undefined;
    return payload?.message || error.message || 'Network request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
};

export class AppError extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}
