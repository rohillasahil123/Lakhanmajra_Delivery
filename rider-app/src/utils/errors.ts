import {AxiosError} from 'axios';
import {ApiErrorResponse} from '../types/rider';

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
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
