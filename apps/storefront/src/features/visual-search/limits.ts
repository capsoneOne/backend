/**
 * Upload limit for visual search, in one place.
 *
 * Enforced in three spots, all reading this constant:
 *
 *   1. the browser, before anything is sent — the only one that yields a good message
 *   2. the route handler at src/app/api/visual-search, because it is a public endpoint
 *   3. `MAX_UPLOAD_BYTES` on the Vendure controller's multer config
 *
 * Keep (1) the binding constraint so users get our copy rather than a framework error.
 *
 * There is deliberately no base64 arithmetic here any more. The upload is multipart
 * now, so the bytes on the wire are the bytes of the file — the old ~37% inflation and
 * the server-action body limit it kept colliding with are both gone.
 */

/** Largest image we accept. */
export const VISUAL_SEARCH_MAX_FILE_BYTES = 6 * 1024 * 1024;

/** For display: "6 MB". */
export const VISUAL_SEARCH_MAX_FILE_MB = Math.round(
    VISUAL_SEARCH_MAX_FILE_BYTES / (1024 * 1024),
);
