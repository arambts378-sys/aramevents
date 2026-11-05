import React from 'react';

/** A validation message shown directly under its input. */
export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[12px] font-medium text-rose-600 font-jakarta">
      {message}
    </p>
  );
}

/** After a failed submit, brings the first invalid input into view, opening "More options" if it's inside. */
export function focusFirstError() {
  setTimeout(() => {
    const field = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.closest('details')?.setAttribute('open', '');
    field?.focus();
  }, 0);
}
