/**
 * A minimal RFC 4180 reader/writer.
 *
 * Hand-rolled rather than pulled from a package because both scripts in this folder
 * need to round-trip the same file (read the source catalog, write the import file,
 * read it back to slice it into batches) and the product descriptions contain commas
 * and embedded quotes. Anything that splits on ',' corrupts them silently.
 */

/** Parses CSV text into an array of rows, each row an array of raw field strings. */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

    while (i < text.length) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                quoted = false;
                i++;
                continue;
            }
            field += ch;
            i++;
            continue;
        }
        if (ch === '"') {
            quoted = true;
            i++;
            continue;
        }
        if (ch === ',') {
            row.push(field);
            field = '';
            i++;
            continue;
        }
        if (ch === '\r') {
            i++;
            continue;
        }
        if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            i++;
            continue;
        }
        field += ch;
        i++;
    }
    if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

/** Serialises one row, quoting only the fields that need it. */
export function toCsvRow(values) {
    return values
        .map(value => {
            const s = value == null ? '' : String(value);
            return /["\,\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',');
}

/** Serialises a header plus rows into a complete CSV document. */
export function toCsv(header, rows) {
    return [toCsvRow(header), ...rows.map(toCsvRow)].join('\n') + '\n';
}

/**
 * Groups Vendure import rows by product.
 *
 * The import format is row-per-variant: a row with a non-empty `name` opens a new
 * product, and every following row with an empty `name` is another variant of it.
 * Batching has to respect that boundary or a batch starts mid-product and the
 * orphaned variant rows are dropped.
 */
export function groupByProduct(dataRows, nameIndex = 0) {
    const groups = [];
    for (const row of dataRows) {
        if ((row[nameIndex] ?? '').trim() !== '' || groups.length === 0) {
            groups.push([row]);
        } else {
            groups[groups.length - 1].push(row);
        }
    }
    return groups;
}
