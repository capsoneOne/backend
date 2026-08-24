/**
 * A small authenticated Admin API client, shared by the bulk-import scripts.
 *
 * Extracted so `ensure-defaults` and `import-catalog` share one session: the setup step
 * runs inline before an import, and re-logging in for each would be pointless.
 */

const DEFAULTS = {
    endpoint: process.env.VENDURE_ADMIN_API_URL ?? 'http://localhost:3000/admin-api',
    username: process.env.SUPERADMIN_USERNAME ?? 'superadmin',
    password: process.env.SUPERADMIN_PASSWORD ?? 'superadmin',
};

export function createAdminClient(overrides = {}) {
    const {endpoint, username, password} = {...DEFAULTS, ...overrides};
    let token = null;

    async function gql(query, variables) {
        let res;
        try {
            res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? {Authorization: `Bearer ${token}`} : {}),
                },
                body: JSON.stringify({query, variables}),
            });
        } catch (e) {
            throw new Error(
                `cannot reach the Admin API at ${endpoint} (${e.message}).\n` +
                    'Is the server running? Try: npm run dev:server',
            );
        }
        captureToken(res);
        const body = await res.json();
        if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
        return body.data;
    }

    /**
     * Posts a single-file mutation per the graphql-multipart-request spec, which is how
     * Vendure's `Upload` scalar expects to receive a file.
     */
    async function upload(query, {content, filename, mimeType}) {
        const form = new FormData();
        form.append('operations', JSON.stringify({query, variables: {file: null}}));
        form.append('map', JSON.stringify({0: ['variables.file']}));
        form.append('0', new Blob([content], {type: mimeType}), filename);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {Authorization: `Bearer ${token}`},
            body: form,
        });
        captureToken(res);
        const body = await res.json();
        if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
        return body.data;
    }

    async function login() {
        const r = await gql(
            `mutation Login($u: String!, $p: String!) {
                login(username: $u, password: $p) {
                    ... on CurrentUser { identifier }
                    ... on ErrorResult { errorCode message }
                }
            }`,
            {u: username, p: password},
        );
        if (r.login.errorCode) throw new Error(`${r.login.errorCode}: ${r.login.message}`);
        return r.login.identifier;
    }

    function captureToken(res) {
        const auth = res.headers.get('vendure-auth-token');
        if (auth) token = auth;
    }

    /** Unwraps Vendure's union results, which return errors as data rather than throwing. */
    function unwrap(result, label) {
        if (result?.errorCode) throw new Error(`${label}: ${result.errorCode} — ${result.message}`);
        return result;
    }

    return {gql, upload, login, unwrap, endpoint};
}
