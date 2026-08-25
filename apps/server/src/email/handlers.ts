import * as fs from 'node:fs';
import * as path from 'node:path';

import {
    defaultEmailHandlers,
    emailAddressChangeHandler,
    emailVerificationHandler,
    orderConfirmationHandler,
    passwordResetHandler,
    type EmailAttachment,
} from '@vendure/email-plugin';
import type { Order } from '@vendure/core';

/**
 * Email images are embedded, not linked.
 *
 * Mail clients do not fetch remote images directly — Gmail and Outlook proxy them
 * through their own servers first. Those servers cannot reach a development machine,
 * so a `<img src="http://localhost:3000/...">` is a broken icon in every real inbox,
 * and the same is true of any host behind a firewall. Attaching the bytes and
 * referencing them by Content-ID sidesteps the fetch entirely: the image travels
 * inside the message and renders wherever the message does.
 */

const LOGO_CID = 'lume-logo';
// The white variant, not the storefront's blue one: the header band is brand blue,
// and the blue mark on it renders perfectly and invisibly. Regenerate from
// apps/storefront/public/brand/lume-mark.png if the mark ever changes.
const LOGO_PATH = path.join(__dirname, '../../static/email/assets/lume-mark-white.png');
const ASSET_UPLOAD_DIR = path.join(__dirname, '../../static/assets');

/**
 * Kept low on purpose. Every thumbnail is carried by the message itself, so a large
 * order would otherwise post a multi-megabyte email — the kind providers throttle.
 */
const MAX_ITEM_IMAGES = 6;
const MAX_IMAGE_BYTES = 512 * 1024;

interface LineImage {
    cid: string;
    filePath: string;
}

/**
 * Maps each order line to an embeddable image, or to null where there is nothing to
 * embed. Both the attachment list and the template variables are built from this, so
 * a line can never reference a Content-ID that was not attached.
 */
function resolveLineImages(order: Order): Array<LineImage | null> {
    return order.lines.map((line, index) => {
        const preview = line.featuredAsset?.preview;
        if (!preview) return null;

        // The preview is an absolute URL by the time the handler sees it; only the
        // part after the asset route corresponds to a path on disk.
        const marker = '/assets/';
        const at = preview.indexOf(marker);
        if (at === -1) return null;

        const relative = preview.slice(at + marker.length).split('?')[0];
        // Refuse anything that climbs out of the asset directory.
        const filePath = path.normalize(path.join(ASSET_UPLOAD_DIR, relative));
        if (!filePath.startsWith(ASSET_UPLOAD_DIR)) return null;

        let stat: fs.Stats;
        try {
            stat = fs.statSync(filePath);
        } catch {
            // Remote storage, or a preview that was never generated. The template
            // renders an empty tile rather than a broken image.
            return null;
        }
        if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) return null;

        return { cid: `item-${index}`, filePath };
    });
}

function logoAttachment(): EmailAttachment[] {
    return fs.existsSync(LOGO_PATH)
        ? [{ path: LOGO_PATH, cid: LOGO_CID, filename: 'lume-mark-white.png' }]
        : [];
}

orderConfirmationHandler
    .setAttachments(event => {
        const images = resolveLineImages(event.order).filter(
            (image): image is LineImage => image !== null,
        );
        return [
            ...logoAttachment(),
            ...images.slice(0, MAX_ITEM_IMAGES).map(image => ({
                path: image.filePath,
                cid: image.cid,
                filename: path.basename(image.filePath),
            })),
        ];
    })
    // Re-declares what the built-in handler sets, because setTemplateVars replaces
    // rather than extends. Dropping `shippingLines` here would silently empty the
    // shipping row in the template.
    .setTemplateVars(event => ({
        order: event.order,
        shippingLines: event.data.shippingLines,
        itemImageCids: resolveLineImages(event.order)
            .slice(0, MAX_ITEM_IMAGES)
            .map(image => image?.cid ?? null),
    }));

/**
 * The mark rides along on every transactional email, not just the order confirmation.
 *
 * The attachment has to be declared per handler — there is no global equivalent — but
 * `logoCid` deliberately is not. It goes in `globalTemplateVars` instead (see
 * `emailLogoCid` below), because `setTemplateVars` *replaces* rather than extends: to
 * add one variable here we would have to restate each handler's own vars, and quietly
 * dropping something like the verification token that way breaks the email with no
 * error. The plugin merges globals underneath handler vars, so this reaches every
 * template without any handler having to know about it.
 *
 * Assigned one at a time rather than in a loop: each handler is generic over its own
 * event type, so an array of them widens to a union that `setAttachments` rejects.
 */
emailVerificationHandler.setAttachments(() => logoAttachment());
passwordResetHandler.setAttachments(() => logoAttachment());
emailAddressChangeHandler.setAttachments(() => logoAttachment());

/**
 * Null when the file is absent, which makes the header fall back to the text wordmark
 * rather than rendering a broken image.
 */
export const emailLogoCid = fs.existsSync(LOGO_PATH) ? LOGO_CID : null;

export const emailHandlers = defaultEmailHandlers;
export { LOGO_CID };
