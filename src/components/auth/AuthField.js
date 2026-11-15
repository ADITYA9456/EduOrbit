'use client';

import { forwardRef } from 'react';

// Labelled auth input. A field error is announced and linked through aria-describedby;
// a form-level error (formErrorId) is linked too so every invalid field points at it.
const AuthField = forwardRef(function AuthField(
  { id, label, icon: Icon, error, hint, invalid, formErrorId, inputClassName = '', ...rest },
  ref
) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, invalid && !error && formErrorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  const isInvalid = Boolean(error || invalid);

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" size={18} aria-hidden="true" />}
        <input
          ref={ref}
          id={id}
          className={`input ${Icon ? 'input--with-icon' : ''} ${inputClassName}`.trim()}
          aria-invalid={isInvalid ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {error && <p id={errorId} className="field-msg field-msg--error">{error}</p>}
      {hint && <span id={hintId} className="form-hint">{hint}</span>}
    </div>
  );
});

export default AuthField;
