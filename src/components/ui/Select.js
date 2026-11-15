'use client';

import { forwardRef, useId } from 'react';

// options: [{ value, label }]; children can be used instead for custom <option>s.
const Select = forwardRef(function Select({ label, hint, error, id, options, className = '', children, ...rest }, ref) {
  const auto = useId();
  const selectId = id || auto;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;
  return (
    <div className="form-group">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select
        ref={ref}
        id={selectId}
        className={`input ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
      </select>
      {error ? (
        <p id={`${selectId}-error`} className="field-msg field-msg--error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="field-msg">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;
