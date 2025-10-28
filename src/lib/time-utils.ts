/**
 * Format a Date object to HH:mm:ss time string (ISO 8601 time format)
 * @param date - Date object (will be treated as time-only)
 * @returns Time string in HH:mm:ss format (universal timestamp format)
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Parse a time string (HH:mm) to a Date object
 * The Date object will have the time set to 1970-01-01 for consistent storage
 * @param timeString - Time string in HH:mm format
 * @returns Date object with the time set
 */
export function parseTime(timeString: string): Date {
  const [hours, minutes = '0'] = timeString.split(':');
  return new Date(1970, 0, 1, parseInt(hours, 10), parseInt(minutes, 10));
}

/**
 * Convert a time string to Date for Prisma (Time type)
 * @param timeString - Time string in HH:mm format
 * @returns Date object suitable for Prisma Time type
 */
export function timeToDate(timeString: string): Date {
  const [hours, minutes = '0'] = timeString.split(':');
  // Create a date with 1970-01-01 as the base date, only time matters
  return new Date(1970, 0, 1, parseInt(hours, 10), parseInt(minutes, 10));
}
