#!/usr/bin/env node
/**
 * KHQR generation spike.
 *
 * Generates a dynamic KHQR payable to a Bakong account, prints the EMV payload,
 * its md5 (the handle you poll Bakong's Open API with), a decode of the payload,
 * and a scannable QR in the terminal.
 *
 *   node apps/server/scripts/khqr-demo.mjs
 *   node apps/server/scripts/khqr-demo.mjs --account you@bank --amount 2.50 --currency khr
 *
 * NOTE ON THE README: the published README shows
 *     new IndividualInfo(accountId, khqrData.currency.khr, name, city, optional)
 * That signature is wrong. The source (node_modules/bakong-khqr/src/model/information.js)
 * is (bakongAccountID, merchantName, merchantCity, optional) — four arguments, with
 * currency read from `optional.currency`. Following the README puts the currency code
 * into merchantName and silently produces a QR with the wrong payee name.
 */
import pkg from 'bakong-khqr';
import QRCode from 'qrcode';

const {BakongKHQR, khqrData, IndividualInfo} = pkg;

// ---- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

// Defaults mirror the transaction you pasted: USD 1 into the ABA account.
const ACCOUNT = arg('account', 'abaakhppxxx@abaa');
const AMOUNT = Number(arg('amount', '1'));
const CURRENCY = arg('currency', 'usd').toLowerCase();
const NAME = arg('name', 'Visual Search Store');
const CITY = arg('city', 'Phnom Penh');
const EXPIRY_MIN = Number(arg('expiry', '5'));

if (!(CURRENCY in khqrData.currency)) {
    console.error(`unknown currency "${CURRENCY}" — expected one of: ${Object.keys(khqrData.currency).join(', ')}`);
    process.exit(1);
}

// ---- generate --------------------------------------------------------------
// A dynamic KHQR (one carrying an amount) MUST have an expiry, or banking apps
// reject it. A static QR omits both amount and expirationTimestamp.
const optional = {
    currency: khqrData.currency[CURRENCY],
    amount: AMOUNT,
    billNumber: `VS-${Date.now().toString(36).toUpperCase()}`,
    storeLabel: 'Visual Search',
    terminalLabel: 'web',
    expirationTimestamp: Date.now() + EXPIRY_MIN * 60 * 1000,
    merchantCategoryCode: '5999',
};

const individual = new IndividualInfo(ACCOUNT, NAME, CITY, optional);
const khqr = new BakongKHQR();
const res = khqr.generateIndividual(individual);

if (res.status?.code !== 0) {
    console.error('generation failed:', JSON.stringify(res.status, null, 2));
    process.exit(1);
}

const {qr, md5} = res.data;

// ---- report ----------------------------------------------------------------
const line = (k, v) => console.log(`  ${k.padEnd(14)} ${v}`);

console.log('\n\x1b[1mKHQR generated\x1b[0m');
line('payee', ACCOUNT);
line('amount', `${AMOUNT} ${CURRENCY.toUpperCase()} (code ${khqrData.currency[CURRENCY]})`);
line('bill number', optional.billNumber);
line('expires', new Date(optional.expirationTimestamp).toISOString());
line('md5', md5);

console.log('\n\x1b[1mEMV payload\x1b[0m');
console.log(qr);

// verify() re-runs the CRC and tag checks against our own output — cheap way to
// catch a malformed payload before a phone camera does.
const verdict = BakongKHQR.verify(qr);
console.log(`\n\x1b[1mSelf-verify\x1b[0m  isValid = ${verdict.isValid}`);

const decoded = BakongKHQR.decode(qr);
console.log('\n\x1b[1mDecoded\x1b[0m');
console.log(JSON.stringify(decoded.data, null, 2));

console.log('\n\x1b[1mScan me\x1b[0m');
console.log(await QRCode.toString(qr, {type: 'terminal', small: true}));

console.log(`Poll for payment:  POST /v1/check_transaction_by_md5  { "md5": "${md5}" }`);
console.log('(Bakong Open API, Bearer token required)\n');
