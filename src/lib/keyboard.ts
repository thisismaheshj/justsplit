/**
 * The on-screen keyboard covers the page instead of shrinking it (index.html
 * sets interactive-widget=resizes-visual, and iOS has always worked that way),
 * so nothing reflows when it opens. The cost is that it can cover the field
 * being typed in. This scrolls just far enough to bring that field back into
 * the part of the screen the keyboard leaves visible.
 */

const MARGIN = 24;

function isTextField(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'hidden'].includes(el.type);
}

function revealFocusedField() {
  const viewport = window.visualViewport;
  const el = document.activeElement;
  if (!viewport || !isTextField(el)) return;

  // Both in layout-viewport coordinates: what is on screen right now.
  const rect = el.getBoundingClientRect();
  const visibleTop = viewport.offsetTop + MARGIN;
  const visibleBottom = viewport.offsetTop + viewport.height - MARGIN;

  let delta = 0;
  if (rect.bottom > visibleBottom) delta = rect.bottom - visibleBottom;
  if (rect.top - delta < visibleTop) delta = rect.top - visibleTop;
  if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'smooth' });
}

export function keepFocusedFieldVisible() {
  const viewport = window.visualViewport;
  if (!viewport) return;

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(revealFocusedField);
  };

  // The keyboard opening (or its suggestion bar growing) changes the visual
  // viewport, not the layout one; that is the moment a field can get covered.
  viewport.addEventListener('resize', schedule);
  // Moving between fields with the keyboard already up resizes nothing.
  document.addEventListener('focusin', () => window.setTimeout(schedule, 50));
}
