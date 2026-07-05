/** חתימת מפתח קבועה — פינה שמאלית תחתונה, מוצגת בכל המסכים. */
export function DevStamp() {
  return (
    <div className="dev-stamp no-print">
      <a
        className="dev-stamp-link"
        href="https://github.com/Or-Ka"
        target="_blank"
        rel="noreferrer"
        aria-label="Open Orka GitHub profile"
      >
        <span className="dev-stamp-tooltip" aria-hidden="true">
          <img src="./dev.gif" alt="" />
        </span>
        <span className="dev-stamp-text">dev by Orka</span>
      </a>
    </div>
  );
}
