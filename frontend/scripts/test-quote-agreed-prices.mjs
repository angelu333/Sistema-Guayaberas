// Offline regression: uses the real service with an in-memory Supabase mock.
// No credentials, network calls, sales or inventory changes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const writes = [];
globalThis.__quoteTestClient = { from(table) {
  const chain = {
    insert(value) { writes.push({ table, action: 'insert', value }); return chain; },
    update(value) { writes.push({ table, action: 'update', value }); return chain; },
    delete() { return chain; }, eq() { return chain; }, select() { return chain; },
    single() { return Promise.resolve({ data: { id: 'quote' }, error: null }); },
    then(resolve) { resolve({ error: null }); },
  };
  return chain;
} };
const source = readFileSync(new URL('../src/services/quotes.service.ts', import.meta.url), 'utf8')
  .replace('import { createClient } from "@/lib/supabase/client";', 'const createClient = () => globalThis.__quoteTestClient;');
const { quotesService: service } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const items = [[2,550,450],[6,500,400],[6,750,550],[3,750,550],[3,750,550],[8,550,450]]
  .map(([quantity,unitPrice,finalUnitPrice], i) => ({variantId: String(i),quantity,unitPrice,finalUnitPrice}));
function verifyTotals(action) {
  const header = writes.find(w => w.table === 'cotizaciones' && w.action === action).value;
  assert.equal(header.total_pieces,28);
  assert.equal(header.subtotal,17500);
  assert.equal(header.total_amount,13500);
  assert.equal(header.discount_amount,4000);
  const rows = writes.find(w => w.table === 'detalle_cotizaciones' && w.action === 'insert').value;
  rows.forEach((row,i) => {
    assert.equal(row.unit_price,items[i].unitPrice);
    assert.equal(row.final_unit_price,items[i].finalUnitPrice);
    assert.equal(row.subtotal,items[i].quantity*items[i].finalUnitPrice);
    assert.equal(row.discount_percent,0);
  });
}
assert.equal((await service.createQuote('tenant','Client',null,items)).success,true);
verifyTotals('insert');
writes.length=0;
assert.equal((await service.updateQuoteItems('quote','tenant',items)).success,true);
verifyTotals('update');
writes.length=0;
service.getQuoteById = async () => ({details: items.map((item,i) => ({...item,id:String(i)}))});
assert.equal((await service.updateQuoteQuantities('quote',items.map(i => ({variantId:i.variantId,quantity:i.quantity*2})))).success,true);
const updated = writes.find(w => w.table==='cotizaciones').value;
assert.equal(updated.total_amount,27000);
assert.equal(updated.subtotal,35000);
writes.filter(w => w.table==='detalle_cotizaciones').forEach((w,i)=>assert.equal(w.value.final_unit_price,items[i].finalUnitPrice));
console.log('PASS: create/edit = 13,500; regular = 17,500; savings = 4,000; quantity changes preserve agreed prices.');
delete globalThis.__quoteTestClient;
