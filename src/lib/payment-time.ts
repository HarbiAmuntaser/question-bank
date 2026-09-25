export const PAYMENT_OPERATIONAL_TIME_ZONE = "Asia/Riyadh";

const RIYADH_UTC_OFFSET_HOURS = 3;
const DATE_TIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function parsePaymentDateTimeLocal(value: string): Date {
  const match = DATE_TIME_LOCAL.exec(value.trim());
  if (!match) throw new RangeError("invalid_payment_datetime");
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new RangeError("invalid_payment_datetime");
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour - RIYADH_UTC_OFFSET_HOURS, minute));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYMENT_OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  if (read("year") !== year || read("month") !== month || read("day") !== day || read("hour") !== hour || read("minute") !== minute) {
    throw new RangeError("invalid_payment_datetime");
  }
  return date;
}
