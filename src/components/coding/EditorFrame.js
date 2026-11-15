// Wrapper around the code editor. Gives it a real height at every width and shows a short
// note on narrow screens, where typing code is cramped.
export default function EditorFrame({ children, className = '' }) {
  return (
    <div className={`editor-frame ${className}`}>
      <p className="editor-frame__note" role="note">
        Editing code is cramped on a small screen. Rotate your phone or use a larger screen for the best experience.
      </p>
      <div className="editor-frame__body">{children}</div>
    </div>
  );
}
