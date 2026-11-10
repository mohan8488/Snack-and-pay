/**
 * Snack and Pay – backend (Google Apps Script)
 *
 * Paste this into Extensions > Apps Script of your Google Sheet.
 * Change the two settings below, run setup() once, then deploy as a web app.
 */

const ADMIN_PIN = '0000';   // Change this! Needed to record payments.
const CURRENCY  = 'EUR';    // ISO currency code, e.g. EUR, USD, CHF
const COFFEE_NAME = 'Coffee'; // How coffee shows up in the Entries tab and on receipts

/* ---------- One-time setup ---------- */

function setup() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, 'Snacks', ['Snack', 'Price', 'Active'], [
    ['Chocolate bar', 1.20, true],
    ['Chips', 1.50, true],
    ['Gummy bears', 1.00, true],
    ['Soft drink', 1.80, true],
  ]);
  ensureSheet_(ss, 'People', ['Name', 'Active'], [
    ['Anna', true],
    ['Ben', true],
  ]);
  ensureSheet_(ss, 'Entries', ['Timestamp', 'Name', 'Snack', 'Quantity', 'Unit price', 'Amount', 'Removed at']);
  ensureSheet_(ss, 'Payments', ['Timestamp', 'Name', 'Amount', 'Note']);
  getCoffeePrice_();
}

function ensureSheet_(ss, name, headers, sampleRows) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    if (sampleRows && sampleRows.length) {
      sh.getRange(2, 1, sampleRows.length, sampleRows[0].length).setValues(sampleRows);
    }
  }
  return sh;
}

/* ---------- Web app entry points ---------- */

function doGet(e)  { return respond_(e && e.parameter ? e.parameter : {}); }

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { /* empty body */ }
  return respond_(body);
}

function respond_(req) {
  let out;
  try {
    out = Object.assign({ ok: true }, route_(req));
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function route_(req) {
  switch (req.action) {
    case 'config':  return getConfig_();
    case 'summary': return { summary: getSummary_(canonicalName_(req.name)) };
    case 'add':     return addEntries_(req.name, req.items);
    case 'remove':  return removeEntry_(req.name, req.id);
    case 'admin':   checkPin_(req.pin); return { people: getAllBalances_() };
    case 'pay':     checkPin_(req.pin); return recordPayment_(req.name, req.amount, req.note);
    default:        throw new Error('Unknown action.');
  }
}

/* ---------- Helpers ---------- */

function rows_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" is missing. Run setup() in Apps Script.');
  return sh.getDataRange().getValues().slice(1);
}

function isActive_(v) { return v === '' || v === true || String(v).toUpperCase() === 'TRUE'; }
function round2_(n)   { return Math.round(Number(n) * 100) / 100; }
function monthKey_(d) { return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM'); }

function getSnacks_() {
  return rows_('Snacks')
    .filter(r => String(r[0]).trim() && isActive_(r[2]))
    .map(r => ({ name: String(r[0]).trim(), price: round2_(r[1]) }));
}

function getPeople_() {
  return rows_('People')
    .filter(r => String(r[0]).trim() && isActive_(r[1]))
    .map(r => String(r[0]).trim())
    .sort((a, b) => a.localeCompare(b));
}

function canonicalName_(name) {
  const wanted = String(name || '').trim().toLowerCase();
  const match = getPeople_().find(p => p.toLowerCase() === wanted);
  if (!match) throw new Error('That name is not on the list. Ask the admin to add you.');
  return match;
}

function checkPin_(pin) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('pinFails') || 0);
  if (fails >= 10) throw new Error('Too many wrong PINs. Try again in 10 minutes.');
  if (String(pin) !== String(ADMIN_PIN)) {
    cache.put('pinFails', String(fails + 1), 600);
    throw new Error('Wrong PIN.');
  }
}

/* ---------- Actions ---------- */

function getConfig_() {
  return { snacks: getSnacks_(), people: getPeople_(), currency: CURRENCY, coffeePrice: getCoffeePrice_() };
}

/* The coffee price lives in the Settings tab (created automatically). */
function getCoffeePrice_() {
  const sh = ensureSheet_(SpreadsheetApp.getActive(), 'Settings', ['Setting', 'Value'], [['Coffee price', 0.50]]);
  const row = sh.getDataRange().getValues().slice(1)
    .find(r => String(r[0]).trim().toLowerCase() === 'coffee price');
  const price = row ? round2_(String(row[1]).replace(',', '.')) : NaN;
  if (!(price >= 0)) throw new Error('Set a valid "Coffee price" in the Settings tab.');
  return price;
}

function addEntries_(name, items) {
  const person = canonicalName_(name);
  if (!Array.isArray(items) || !items.length) throw new Error('Pick at least one snack.');

  const prices = {};
  getSnacks_().forEach(s => { prices[s.name] = s.price; });

  const now = new Date();
  let coffeePrice = null;
  const newRows = items.map(it => {
    const qty = Math.floor(Number(it.qty));
    if (!(qty >= 1 && qty <= 50)) throw new Error('Quantity must be between 1 and 50.');
    if (it.type === 'coffee') {
      if (coffeePrice === null) coffeePrice = getCoffeePrice_();
      return [now, person, COFFEE_NAME, qty, coffeePrice, round2_(coffeePrice * qty)];
    }
    if (!(it.snack in prices)) throw new Error('Unknown snack: ' + it.snack);
    const price = prices[it.snack];
    return [now, person, it.snack, qty, price, round2_(price * qty)];
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('Entries');
    sh.getRange(sh.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return { summary: getSummary_(person) };
}

function recordPayment_(name, amount, note) {
  const person = String(name || '').trim();
  const value = round2_(amount);
  if (!person) throw new Error('Name is missing.');
  if (!(value > 0)) throw new Error('Enter an amount greater than 0.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    SpreadsheetApp.getActive().getSheetByName('Payments')
      .appendRow([new Date(), person, value, note || '']);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return { people: getAllBalances_() };
}

/* ---------- Balances ----------
 * Everything ever eaten minus everything ever paid = what someone owes.
 * Unpaid amounts from earlier months therefore carry over automatically.
 */

function emptyBalance_(name, month) {
  return { name, month, carried: 0, monthTotal: 0, paidThisMonth: 0, owed: 0, items: {}, entries: [] };
}

function computeBalances_() {
  const month = monthKey_(new Date());
  const map = {};
  const get = n => (map[n] = map[n] || emptyBalance_(n, month));

  getPeople_().forEach(get);

  rows_('Entries').forEach(r => {
    if (!r[1] || r[6]) return;   // skip empty and removed entries
    const b = get(String(r[1]).trim());
    const amount = Number(r[5]) || 0;
    if (monthKey_(r[0]) < month) {
      b.carried += amount;
    } else {
      b.monthTotal += amount;
      const key = String(r[2]);
      b.items[key] = b.items[key] || { snack: key, qty: 0, amount: 0 };
      b.items[key].qty += Number(r[3]) || 0;
      b.items[key].amount += amount;
      b.entries.push({
        id: entryId_(r),
        time: new Date(r[0]).toISOString(),
        snack: key,
        qty: Number(r[3]) || 0,
        amount: round2_(amount)
      });
    }
  });

  rows_('Payments').forEach(r => {
    if (!r[1]) return;
    const b = get(String(r[1]).trim());
    const amount = Number(r[2]) || 0;
    if (monthKey_(r[0]) < month) b.carried -= amount;
    else b.paidThisMonth += amount;
  });

  Object.values(map).forEach(b => {
    b.carried = round2_(b.carried);
    b.monthTotal = round2_(b.monthTotal);
    b.paidThisMonth = round2_(b.paidThisMonth);
    b.owed = round2_(b.carried + b.monthTotal - b.paidThisMonth);
    b.items = Object.values(b.items)
      .map(i => ({ snack: i.snack, qty: i.qty, amount: round2_(i.amount) }))
      .sort((a, b2) => b2.amount - a.amount);
    b.entries.sort((a, b2) => b2.time.localeCompare(a.time));
  });
  return map;
}

function getSummary_(name) {
  const all = computeBalances_();
  return all[name] || emptyBalance_(name, monthKey_(new Date()));
}

function getAllBalances_() {
  return Object.values(computeBalances_())
    .map(b => { const c = Object.assign({}, b); delete c.entries; return c; })
    .sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
}

/* ---------- Corrections ----------
 * People can remove their own entries from the current month.
 * The row stays in the sheet, marked in the "Removed at" column, so you keep a history.
 */

function entryId_(r) { return new Date(r[0]).getTime() + '|' + String(r[2]); }

function removeEntry_(name, id) {
  const person = canonicalName_(name);
  const month = monthKey_(new Date());

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('Entries');
    if (sh.getRange(1, 7).getValue() === '') sh.getRange(1, 7).setValue('Removed at').setFontWeight('bold');
    const values = sh.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const r = values[i];
      if (String(r[1]).trim() !== person || r[6] || entryId_(r) !== String(id)) continue;
      if (monthKey_(r[0]) !== month) throw new Error('Only entries from this month can be removed. Ask the admin for older ones.');
      sh.getRange(i + 1, 7).setValue(new Date());
      SpreadsheetApp.flush();
      return { summary: getSummary_(person) };
    }
  } finally {
    lock.releaseLock();
  }
  throw new Error('That entry was not found. It may already be removed.');
}