// Single place for links to other apps. Set the URL in the environment; nothing is hardcoded.
// When the URL is missing or invalid, getSecondApp() returns null and the UI renders no link.

function cleanUrl(value) {
  try {
    const url = new URL((value || '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin + url.pathname.replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
}

export function getSecondApp() {
  const url = cleanUrl(process.env.NEXT_PUBLIC_SECOND_APP_URL);
  if (!url) return null;
  return {
    url,
    name: (process.env.NEXT_PUBLIC_SECOND_APP_NAME || 'EDU Orbit Prep').trim(),
    // Icon is read from the other app itself; override only if it lives somewhere else.
    iconUrl: cleanUrl(process.env.NEXT_PUBLIC_SECOND_APP_ICON_URL) || `${new URL(url).origin}/favicon.ico`,
  };
}
