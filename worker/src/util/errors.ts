import { MESSAGES } from "../config/messages";

/** HTTP ステータス付きの想定内エラー。Python 版の HTTPException に相当する。 */
export class HttpError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
  }
}

export function badRequest(detail: string): HttpError {
  return new HttpError(400, detail);
}

export function unprocessable(detail: string): HttpError {
  return new HttpError(422, detail);
}

export function unauthorized(): HttpError {
  return new HttpError(401, MESSAGES.invalidSession);
}

export function notFound(detail: string): HttpError {
  return new HttpError(404, detail);
}

export function conflict(detail: string): HttpError {
  return new HttpError(409, detail);
}
