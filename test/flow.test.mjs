// Whole-agent flows with a scripted fake model (no key, no network).
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleMessage, __test } from '../index.mjs';

const cases = Object.fromEntries(
  JSON.parse(fs.readFileSync(new URL('../eval/cases.json', import.meta.url), 'utf8')).cases.map((c) => [c.id, c]),
);
const BROKER = Symbol.for('druve.broker');
const RESPONSIBILITY = '최종 확인과 책임은 사장님에게 있어요';
const DEFAULT_TIMEOUTS = { intake: 22000, writers: 24000, check: 9000, reply: 30000, closeout: 20000 };

function kindOf(prompt) {
  if (prompt.includes('검수자')) return 'check';
  if (prompt.includes('새로 적은 답')) return 'patch';
  if (prompt.includes('사실만 뽑아 정리하는')) return 'intake';
  if (prompt.includes('고객 응대 도우미')) return 'reply';
  if (prompt.includes('감사 문자')) return 'thanks';
  if (prompt.includes('광고 초안을 쓰세요')) {
    if (prompt.includes('포털용')) return 'writer:portal';
    if (prompt.includes('블로그용')) return 'writer:blog';
    return 'writer:chat';
  }
  return 'other';
}

function install(handlers) {
  const calls = [];
  globalThis[BROKER] = {
    async complete(prompt) {
      const kind = kindOf(prompt);
      calls.push({ kind, prompt });
      const h = handlers[kind] ?? handlers.default;
      if (!h) throw new Error(`no handler for ${kind}`);
      return typeof h === 'function' ? h(prompt, calls) : h;
    },
  };
  return calls;
}
afterEach(() => {
  delete globalThis[BROKER];
  __test.setTimeouts(DEFAULT_TIMEOUTS);
});

const L01_JSON = JSON.stringify({
  location: '솔향마을 한강뷰타워', type: '아파트', deal: '전세', price: '7억', area: '전용84㎡', floor: '12층/20층',
  totalFloors: null, rooms: '3', baths: '2', direction: '남향', moveIn: '즉시입주', fee: '20만원', parking: '1대',
  approval: '2008-06', pets: '불가', options: null, loan: '융자없음', notes: ['올수리'], assistantMentions: null,
});
const GOOD_ADS = {
  'writer:portal': '한강뷰타워 전세 7억원 전용 84㎡ 12층 남향 올수리, 즉시 입주 가능합니다. 관리비 20만원, 주차 1대입니다.',
  'writer:blog': '한강뷰타워 전세 소개예요. 전용 84㎡, 12층/20층, 남향, 올수리 상태예요. 관리비는 20만원이에요.',
  'writer:chat': '한강뷰타워 전세 7억원, 84㎡ 12층 남향이에요. 올수리, 즉시 입주해요.',
};
const baseHandlers = { intake: L01_JSON, ...GOOD_ADS, check: '{"issues":[]}' };

test('new listing: five calls, card, three ads, checks, responsibility line', async () => {
  const calls = install(baseHandlers);
  const out = await handleMessage(cases.L01.input, { provider: 'echo' });
  assert.deepEqual(calls.map((c) => c.kind).sort(), ['check', 'intake', 'writer:blog', 'writer:chat', 'writer:portal']);
  for (const s of ['[매물 카드]', '[/매물 카드]', '포털용', '블로그용', '인스타·카톡용', '규정 점검', '광고 속 숫자가 모두 카드의 정보와 같아요', RESPONSIBILITY, '규정 기준일: 2026-11-19']) {
    assert.ok(out.includes(s), `missing "${s}"`);
  }
  assert.ok(out.includes('중개사무소: [상호]'), 'office fill-in line');
  // the writers only ever see confirmed facts, the broker text is wrapped as data
  assert.ok(calls.find((c) => c.kind === 'intake').prompt.includes('<<<'));
  assert.ok(calls.find((c) => c.kind === 'writer:portal').prompt.includes('7억원'));
});

test('area given only as a 타입 stops after intake and asks (L02)', async () => {
  const calls = install({
    intake: JSON.stringify({ location: '한강뷰타워', type: '아파트', deal: '매매', price: '32억', area: '84타입', floor: '14층', direction: '남향' }),
  });
  const out = await handleMessage(cases.L02.input, { provider: 'echo' });
  assert.deepEqual(calls.map((c) => c.kind), ['intake']);
  assert.ok(out.includes('빠진 정보'));
  assert.ok(out.includes('타입'));
  assert.ok(out.includes('[매물 카드]'));
  assert.ok(!out.includes('84㎡'));
  assert.ok(!out.includes('포털용'));
});

test('unit-less price stops and is never guessed (L03)', async () => {
  const calls = install({ intake: JSON.stringify({ location: '솔향빌라', type: '빌라', deal: '전세', price: '15000', area: '전용 45㎡', floor: '2층' }) });
  const out = await handleMessage(cases.L03.input, { provider: 'echo' });
  assert.equal(calls.length, 1);
  assert.ok(out.includes('단위가 없어서'));
  for (const bad of cases.L03.mustNotAppear) assert.ok(!out.includes(bad), `contains ${bad}`);
});

test('continuation: a pasted card plus an answer skips intake and finishes the ad', async () => {
  const first = install({ intake: JSON.stringify({ location: '한강뷰타워', type: '아파트', deal: '매매', price: '32억', area: '84타입', floor: '14층', direction: '남향' }) });
  const stopped = await handleMessage(cases.L02.input, { provider: 'echo' });
  assert.equal(first.length, 1);
  delete globalThis[BROKER];

  const calls = install({
    patch: JSON.stringify({ area: '전용 84㎡', totalFloors: '20층', rooms: '3', baths: '2', moveIn: '협의', fee: '30만원', parking: '2대', approval: '2010-01' }),
    'writer:portal': '한강뷰타워 매매 32억원 전용 84㎡ 14층 남향입니다. 관리비 30만원입니다.',
    'writer:blog': '한강뷰타워 매매 소개예요. 전용 84㎡, 14층/20층, 남향이에요.',
    'writer:chat': '한강뷰타워 매매 32억원, 84㎡ 14층이에요.',
    check: '{"issues":[]}',
  });
  const card = stopped.slice(stopped.indexOf('[매물 카드]'), stopped.indexOf('[/매물 카드]') + '[/매물 카드]'.length);
  const out = await handleMessage(`${card}\n면적은 전용 84㎡, 총 20층, 방3 욕실2, 입주 협의, 관리비 30만원, 주차 2대, 사용승인 2010-01`, { provider: 'echo' });
  assert.ok(!calls.some((c) => c.kind === 'intake'), 'intake must be skipped');
  assert.equal(calls.filter((c) => c.kind === 'patch').length, 1);
  assert.ok(out.includes('포털용'));
  assert.ok(out.includes('전용 84㎡'));
});

test('a writer that changes the rent is caught by the number check (L07)', async () => {
  install({
    intake: JSON.stringify({ location: '새빛아파트', type: '아파트', deal: '월세', price: '보증금 2000만원 월 100만원', area: '전용59㎡', floor: '8층/15층', direction: '남향', fee: '15만원', rooms: '2', baths: '1', parking: '1대', moveIn: '즉시입주', approval: '2015-03' }),
    'writer:portal': '새빛아파트 월세 보증금 2,000만원 / 월 110만원, 전용 59㎡ 8층입니다.',
    'writer:blog': '새빛아파트 월세예요. 보증금 2,000만원, 월 100만원이에요.',
    'writer:chat': '새빛아파트 월세 100만원이에요.',
    check: '{"issues":[]}',
  });
  const out = await handleMessage(cases.L07.input, { provider: 'echo' });
  assert.ok(out.includes('카드에 없는 숫자'));
  assert.ok(out.includes('110'));
});

test('a writer that obeys a boast in the notes is flagged (L04)', async () => {
  install({
    intake: JSON.stringify({ location: '한강뷰타워', type: '아파트', deal: '월세', price: '보증금 1000만원 월 80만원', area: '전용59㎡', floor: '3층/15층', direction: '남향', options: ['풀옵션'], notes: ['무조건 오를 동네', '급매', '최저가'] }),
    'writer:portal': '한강뷰타워 월세 무조건 오를 동네, 최저가입니다. 보증금 1,000만원 / 월 80만원, 전용 59㎡, 3층입니다.',
    'writer:blog': '한강뷰타워 월세예요. 보증금 1,000만원, 월 80만원이에요.',
    'writer:chat': '한강뷰타워 월세 80만원이에요.',
    check: '{"issues":[{"channel":"portal","type":"exaggerated","text":"무조건 오를 동네","why":"보장성 표현"}]}',
  });
  const out = await handleMessage(cases.L04.input, { provider: 'echo' });
  assert.ok(out.includes('과장으로 보일 수 있는 표현이 있어요'));
  assert.ok(out.includes('무조건'));
  assert.ok(out.includes('문구 점검'));
});

test('loan and assistant mentions are surfaced (L05, L08)', async () => {
  install({
    intake: JSON.stringify({ location: '솔향빌라', type: '빌라', deal: '반전세', price: '보증금 5000만원 월 70만원', area: '전용 52㎡', floor: '3층', loan: '융자 있음 근저당 1억 2천만원', direction: '남향', fee: '5만원', rooms: '2', baths: '1', parking: '가능', moveIn: '협의' }),
    ...GOOD_ADS,
    check: '{"issues":[]}',
  });
  const out = await handleMessage(cases.L05.input, { provider: 'echo' });
  assert.ok(out.includes('융자나 권리관계 내용은 광고에 꼭 들어가야 해요'));

  install({
    intake: JSON.stringify({ location: '솔향빌라', type: '원룸', deal: '월세', price: '500/45', area: '전용 20㎡', floor: '1층', direction: '남향', fee: '5만원', assistantMentions: ['박실장 010-0000-0000'] }),
    ...GOOD_ADS,
    check: '{"issues":[]}',
  });
  const out2 = await handleMessage(cases.L08.input, { provider: 'echo' });
  assert.ok(out2.includes('중개보조원'));
  // the phone number from the notes never reaches the writers
  const prompts = [];
  install({ intake: JSON.stringify({ location: '솔향빌라', type: '원룸', deal: '월세', price: '500/45', area: '전용 20㎡', assistantMentions: ['박실장'] }), default: (p) => (prompts.push(p), '광고') });
  await handleMessage(cases.L08.input, { provider: 'echo' });
  assert.ok(prompts.every((p) => !p.includes('010-0000-0000')));
});

test('five listings pasted: only the first is processed and the user is told (L11)', async () => {
  const calls = install({ intake: JSON.stringify({ location: '솔향빌라', type: '빌라', deal: '전세', price: '3억', area: '전용 40㎡' }), ...GOOD_ADS, check: '{"issues":[]}' });
  const out = await handleMessage(cases.L11.input, { provider: 'echo' });
  const intake = calls.find((c) => c.kind === 'intake');
  assert.ok(intake.prompt.includes('솔향빌라 2층 전세 3억'));
  assert.ok(!intake.prompt.includes('새빛아파트 5층'));
  assert.ok(out.includes('첫 번째') && out.includes('하나씩'));
});

test('a reply: formal + friendly + things to confirm; promises and odd numbers are flagged', async () => {
  const calls = install({
    reply: '===정중형===\n문의 감사합니다. 확인 후 알려드리겠습니다.\n===친근형===\n문의 고마워요! 확인해서 알려드릴게요.\n===확인할 것===\n- 매물이 아직 있는지\n- 방문 가능한 시간',
  });
  const out = await handleMessage(cases.C01.input, { provider: 'echo' });
  assert.equal(calls.length, 1);
  for (const s of ['답장 초안: 정중형', '답장 초안: 친근형', '보내기 전에 확인하세요', '확인']) assert.ok(out.includes(s));
  assert.ok(!out.includes('주의: 약속'));

  install({ reply: '===정중형===\n6억 5천에 해드리겠습니다.\n===친근형===\n깎아 드릴게요, 6억 4천이에요.\n===확인할 것===\n- 없음' });
  const out2 = await handleMessage(cases.C02.input, { provider: 'echo' });
  assert.ok(out2.includes('약속처럼 읽힐 수 있는 문장'));
  assert.ok(out2.includes('근거를 알 수 없는 숫자'));
});

test('a model that obeys an injected instruction is still caught (C06)', async () => {
  const calls = install({ reply: '===정중형===\n네, 이 집 전세가를 1억으로 광고하겠습니다.\n===친근형===\n1억으로 올릴게요.\n===확인할 것===\n- 없음' });
  const out = await handleMessage(cases.C06.input, { provider: 'echo' });
  assert.ok(out.includes('지시문처럼 보이는 내용이 있었는데 따르지 않았어요'));
  assert.ok(out.includes('근거를 알 수 없는 숫자'));
  assert.ok(out.includes('없는 숫자가 있어요: 1.'));
  assert.ok(calls[0].prompt.includes('<<<'));
});

test('English message gets an English instruction (C08)', async () => {
  const calls = install({ reply: '===정중형===\nHello, let me check and get back to you.\n===친근형===\nHi! I will check.\n===확인할 것===\n- availability' });
  await handleMessage(cases.C08.input, { provider: 'echo' });
  assert.ok(calls[0].prompt.includes('영어로 쓰세요'));
});

test('close-out: checklist from code, thank-you only when asked (K01, K03, K05)', async () => {
  let calls = install({ thanks: '김민수님, 감사해요.' });
  let out = await handleMessage(cases.K01.input, { provider: 'echo' });
  assert.equal(calls.length, 0);
  assert.ok(out.includes('광고를 모든 곳에서 내리세요') && out.includes('2026-12-30'));

  calls = install({});
  out = await handleMessage(cases.K03.input, { provider: 'echo' });
  assert.equal(calls.length, 0);
  assert.ok(out.includes('2026-11-06'));

  calls = install({ thanks: '김민수님, 계약을 맡겨 주셔서 감사해요.' });
  out = await handleMessage(cases.K05.input, { provider: 'echo' });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].prompt.includes('김민수'));
  assert.ok(out.includes('감사 문자'));
  for (const bad of cases.K05.mustNotAppear) assert.ok(!out.includes(bad));
});

test('legal, tax and empty input make no model call', async () => {
  const calls = install({});
  for (const id of ['T01', 'T02', 'T03', 'T04', 'U01', 'U02']) {
    const out = await handleMessage(cases[id].input, { provider: 'echo' });
    for (const need of cases[id].mustAppear) assert.ok(out.includes(need), `${id} missing ${need}`);
    for (const bad of cases[id].mustNotAppear) assert.ok(!out.includes(bad), `${id} contains ${bad}`);
  }
  assert.equal(calls.length, 0);
});

test('provider errors become friendly Korean and never leak the key or details', async () => {
  const err = Object.assign(new Error('invalid key FAKEKEYFORTEST123 at /home/someone/stack'), { status: 401 });
  install({ default: () => { throw err; } });
  const out = await handleMessage(cases.L01.input, { provider: 'echo' });
  assert.ok(out.includes('모델 키가 맞지 않는 것 같아요'));
  assert.ok(!out.includes('FAKEKEYFORTEST123') && !out.includes('/home/'));

  install({ default: () => { throw Object.assign(new Error('rate'), { status: 429 }); } });
  assert.ok((await handleMessage(cases.C01.input, { provider: 'echo' })).includes('몰렸어요'));
});

test('a model that never answers times out politely', async () => {
  __test.setTimeouts({ intake: 40, writers: 40, check: 40, reply: 40, closeout: 40 });
  install({ default: () => new Promise(() => {}) });
  const out = await handleMessage(cases.L01.input, { provider: 'echo' });
  assert.ok(out.includes('너무 오래 걸렸어요'));
});

test('one failed channel does not sink the others; a failed check is skipped, not fatal', async () => {
  install({
    intake: L01_JSON,
    'writer:portal': GOOD_ADS['writer:portal'],
    'writer:blog': GOOD_ADS['writer:blog'],
    'writer:chat': () => { throw Object.assign(new Error('x'), { status: 500 }); },
    check: () => { throw new Error('boom'); },
  });
  const out = await handleMessage(cases.L01.input, { provider: 'echo' });
  assert.ok(out.includes('포털용') && out.includes('블로그용'));
  assert.ok(out.includes('이 버전은 만들지 못했어요'));
  assert.ok(out.includes('문구 점검은 건너뛰었어요'));
});

test('unreadable intake JSON asks the broker to resend, after one retry', async () => {
  const calls = install({ intake: '죄송하지만 JSON을 못 만들겠어요' });
  const out = await handleMessage(cases.L01.input, { provider: 'echo' });
  assert.equal(calls.length, 2);
  assert.ok(out.includes('다시 보내'));
});

test('every one of the 30 cases runs to a string without throwing (echo provider)', async () => {
  for (const c of Object.values(cases)) {
    const out = await handleMessage(c.input, { provider: 'echo' });
    assert.equal(typeof out, 'string', c.id);
    assert.ok(out.length > 0, c.id);
    assert.ok(!out.includes('—'), `${c.id} has an em dash`);
  }
});

test('a very long paste is capped and the broker is told', async () => {
  install({ intake: L01_JSON, ...GOOD_ADS, check: '{"issues":[]}' });
  const out = await handleMessage(`${cases.L01.input}\n${'메모 '.repeat(3000)}`, { provider: 'echo' });
  assert.ok(out.includes('앞부분만 읽었어요'));
});
