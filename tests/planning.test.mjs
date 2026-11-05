import test from 'node:test';
import assert from 'node:assert/strict';
import { splitMoney, cents, monthlyDates, revisionTotals, tfrAnnualHistory } from '../lib/money/planning.ts';

test('centesimi eccedenti nella prima rata, somma esatta', () => {
  const values = splitMoney(1639, 24);
  assert.equal(values[0], 68.33); assert.equal(values[23], 68.29);
  assert.equal(values.reduce((s,v) => s + cents(v),0), 163900);
  assert.throws(() => splitMoney(100, 0)); assert.throws(() => splitMoney(100, 1.5));
});
test('scadenze a fine mese senza salto di febbraio', () => {
  assert.deepEqual(monthlyDates('2026-01-31', 3), ['2026-01-31','2026-02-28','2026-03-31']);
  assert.deepEqual(monthlyDates('2027-12-31', 3), ['2027-12-31','2028-01-31','2028-02-29']);
});
const fourPaid = Array.from({length:4}, (_,i) => ({id:String(i),kind:'regular',amount:25,creditApplied:0,paid:true}));
test('100 già pagati, nuovo totale 500: nuove rate per 400', () => {
  const t = revisionTotals(fourPaid, 500, true);
  assert.equal(t.remaining,400); assert.equal(t.preserved.length,4); assert.equal(t.removed.length,0);
});
test('mantenere rate non pagate non duplica il loro importo', () => {
  const rows = fourPaid.map((r,i) => ({...r,paid:i<2}));
  assert.equal(revisionTotals(rows,500,false).remaining,400);
  assert.equal(revisionTotals(rows,500,true).remaining,450);
  assert.equal(revisionTotals(rows,500,true).removed.length,2);
});
test('rate extra e saldi restano esterni al preventivo; crediti protetti', () => {
  const rows = [...fourPaid, {id:'extra',kind:'extraordinary',amount:20,creditApplied:0,paid:false}, {id:'credit',kind:'regular',amount:0,creditApplied:30,paid:true}];
  assert.equal(revisionTotals(rows,500,true).remaining,370);
  assert.equal(revisionTotals(rows,500,true).removed.length,0);
});
test('nessuna rata negativa per preventivo inferiore agli anticipi', () => {
  const t = revisionTotals(fourPaid,50,true);
  assert.equal(t.remaining,0); assert.equal(t.excess,50); assert.equal(t.invalidPreservation,false);
});
test('riduzione incompatibile con rate ancora da pagare conservate', () => {
  assert.equal(revisionTotals(fourPaid.map(r=>({...r,paid:false})),50,false).invalidPreservation,true);
});
test('storico cumulativo: mese di competenza e trasferimenti alla data effettiva', () => {
  const base={closingYear:2025,companyAmount:1000,fundAmount:0};
  const entries=[
    {competenceMonth:'2025-12',tfrAmount:999,destination:'company'}, // già nel dato iniziale
    {competenceMonth:'2026-01',tfrAmount:100,destination:'company'},
    {competenceMonth:'2026-12',tfrAmount:200,destination:'fund',status:'pending',paidAt:'2027-02-15',personalContribution:50},
    {competenceMonth:'2027-01',tfrAmount:300,destination:'fund'},
  ];
  const transfers=[{paidAt:'2026-09-01',amount:500},{paidAt:'2027-01-01',amount:100}];
  assert.deepEqual(tfrAnnualHistory(base,entries,transfers,2027),[
    {year:2025,company:1000,fund:0},{year:2026,company:600,fund:700}
  ]);
  assert.deepEqual(tfrAnnualHistory(base,entries,transfers,2026),[{year:2025,company:1000,fund:0}]);
});
test('storico non nasconde un saldo negativo dovuto a dati incoerenti', () => {
  assert.equal(tfrAnnualHistory({closingYear:2025,companyAmount:10,fundAmount:0},[],[{paidAt:'2026-01-01',amount:20}],2027)[1].company,-10);
});
