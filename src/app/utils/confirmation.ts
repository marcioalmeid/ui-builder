/** Simple confirmation helper that wraps window.confirm with a consistent API. */
export function confirmDialog(message: string): boolean {
  return window.confirm(message);
}

/** Simple alert helper that wraps window.alert with a consistent API. */
export function alertDialog(message: string): void {
  window.alert(message);
}
