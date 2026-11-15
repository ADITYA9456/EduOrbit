'use client';

import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input({ label, hint, error, id, className = '', ...rest }, ref) {
  const auto = useId();
  const inputId = id || auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="form-group">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        ref={ref}
        id={inputId}
        className={`input ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="field-msg field-msg--error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="field-msg">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
