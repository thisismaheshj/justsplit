import { isIos } from '@/lib/installPrompt';

/**
 * iOS Safari zooms the page in whenever a field with text under 16px is
 * focused, and does not always zoom back out. Every field is 16px on phones
 * now, but one slip brings it back, so on iPhone and iPad the viewport also
 * caps the scale. iOS keeps pinch-to-zoom working regardless (it has ignored
 * zoom limits for pinch since iOS 10); only the automatic zoom on focus stops.
 * Not applied elsewhere: Android Chrome would honour it and block pinch-zoom.
 */
export function stopIosFocusZoom() {
  if (!isIos()) return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta || meta.content.includes('maximum-scale')) return;
  meta.content = `${meta.content}, maximum-scale=1`;
}
