import { MESSAGES } from "../config/messages";
import { badRequest } from "../util/errors";

/** ハニーポット項目（website）に値があれば bot とみなし 400 にする（Python 版の validate_honeypot と同じ）。 */
export function rejectFilledHoneypot(website: string): void {
  if (website.length > 0) {
    throw badRequest(MESSAGES.botDetected);
  }
}
