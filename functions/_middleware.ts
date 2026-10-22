/**
 * Cloudflare Pages Middleware
 * Normalizes multi-slash paths (e.g. //ws/... to /ws/...) before routing
 */

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.includes('//')) {
    const normalizedPath = url.pathname.replace(/\/+/g, '/');
    url.pathname = normalizedPath;
    return context.next(url.toString());
  }
  return context.next();
};
