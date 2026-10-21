// File inputs and nested dialogs also emit cancel. Only dismiss this dialog itself.
export function closeOwnDialog(event: { target: EventTarget | null; currentTarget: EventTarget | null; preventDefault(): void; stopPropagation(): void }, close: () => void) {
  event.preventDefault();
  event.stopPropagation();
  if (event.target === event.currentTarget) close();
}
