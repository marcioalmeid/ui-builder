import { BorderConfig } from '../models/field';

/** Compute a CSS border string from a Field border config. Returns 'none' when unset. */
export function getBorderStyle(border: BorderConfig | undefined): string {
  if (!border || border.style === 'none') {
    return 'none';
  }
  return `${border.width} ${border.style} ${border.color}`;
}
