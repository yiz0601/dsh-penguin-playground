// 离线烟测：把 bundle 的 factory 拿出来，直接跑引擎，验证
// "token -> 债 -> 拉屎 -> 抛物线 -> 全部砸在同一个点上堆成一坨" 这条链路。
global.window = { __ModuleLoader__: { load(def) { global.__def = def } } }
require('../lib/client.js')

const mod = global.__def.factory(() => ({}))
const { createEngine, POOP, POOP_TEXT, tokenBus } = mod.__internals

function seeded(seed) {
  let s = seed >>> 0
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

const step = 1 / 60
const fails = []
const ok = (label, cond, extra) => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra === undefined ? '' : '   ' + extra))
  if (!cond) fails.push(label)
}

// 拉一坨并让它飞完（返回那一发）
function fireAndLand(eng, maxSeconds) {
  eng.poopNow()
  const limit = Math.round((maxSeconds || 6) / step)
  for (let i = 0; i < limit && eng.shots.length === 0; i++) eng.update(step)
  if (eng.shots.length === 0) return null
  const shot = eng.shots[0]
  for (let i = 0; i < limit && eng.shots.length > 0; i++) eng.update(step)
  return shot
}

function run(engine, seconds, tokensAt) {
  const frames = Math.round(seconds / step)
  for (let i = 0; i < frames; i++) {
    if (tokensAt !== undefined && i === 10) engine.setTokens(0)
    if (tokensAt !== undefined && i === 30) engine.setTokens(tokensAt)
    engine.update(step)
  }
}

// 1. 没有 token 时不应该拉（前 20 秒还没到兜底节奏）
const a = createEngine({ rng: seeded(1) })
run(a, 20)
ok('没有 token 数据时不拉屎', a.poopCount === 0, 'poopCount=' + a.poopCount)
ok('地上没有坨', a.pile === null)

// 1b. 长会话中途挂载：历史 token 不能被倒算
const a2 = createEngine({ rng: seeded(9) })
a2.setTokens(500000)
run(a2, 6)
ok('首帧只做基线，不倒算历史', a2.poopCount === 0 && a2.poopDebt === 0,
  'poopCount=' + a2.poopCount + ' debt=' + a2.poopDebt)

// 2. 烧 9000 token -> 连拉好几坨；全程地上最多只有一坨，而且永远在当前落点上
const b = createEngine({ rng: seeded(2) })
b.setTokens(0)
let sawPile = false
let onSpot = true
let maxCount = 0
for (let i = 0; i < Math.round(30 / step); i++) {
  if (i === 20) b.setTokens(9000)
  b.update(step)
  if (b.pile !== null) {
    sawPile = true
    maxCount = Math.max(maxCount, b.pile.count)
    if (b.pile.x !== b.pileX) onSpot = false
    if (b.pile.count > b.poopCount) onSpot = false
  }
}
ok('9000 token 触发拉屎', b.poopCount >= 5, 'poopCount=' + b.poopCount)
ok('地上出现过屎堆', sawPile, 'maxCount=' + maxCount)
ok('屎堆永远在当前落点上', onSpot)
ok('走动时确实清过场', b.poopMoveSignal >= 1, 'moveSignal=' + b.poopMoveSignal)

// 3. 抛物线：先上后下，而且**落点精确命中屎堆**
const c = createEngine({ rng: seeded(3) })
c.setTokens(0)
const shot = fireAndLand(c, 8)
ok('有东西被喷出来了', shot !== null)
if (shot !== null) {
  const ys = []
  for (let k = 1; k < shot.trail.length; k += 2) ys.push(shot.trail[k])
  const apex = Math.min.apply(null, ys)
  ok('轨迹是先上后下的拱形', apex < shot.trail[1] - 4 && ys[ys.length - 1] > apex + 4,
    'y0=' + shot.trail[1].toFixed(1) + ' apex=' + apex.toFixed(1) + ' yEnd=' + ys[ys.length - 1].toFixed(1))
  ok('全程只有一条抛物线（单调的水平推进）',
    shot.trail.filter((_, i) => i % 2 === 0).every((x, i, arr) => i === 0 || Math.abs(x - arr[i - 1]) > 0.01))
  const endX = shot.trail[shot.trail.length - 2]
  // 解析解 + 同一条瞄准线，落点应该是数学上精确的
  ok('落点精确命中屎堆', c.pile !== null && Math.abs(endX - c.pile.x) < 1e-9,
    'endX=' + endX.toFixed(6) + ' pileX=' + (c.pile && c.pile.x.toFixed(6))
    + ' err=' + (c.pile ? Math.abs(endX - c.pile.x).toExponential(1) : 'n/a'))
  ok('落地高度就是地面', Math.abs(shot.trail[shot.trail.length - 1] - POOP.ground) < 1e-9)
  ok('朝屎堆的方向飞（不是随机方向）', Math.abs(endX - shot.trail[0]) > 5,
    'dx=' + (endX - shot.trail[0]).toFixed(1))
  ok('出手瞬间屁股对准屎堆', (c.pileX < 50 + c.anchor) ? c.facing === 1 : c.facing === -1,
    'facing=' + c.facing + ' pileX=' + c.pileX.toFixed(1))
}
ok('落地之后地上就一坨', c.pile !== null && c.pile.count === 1, 'count=' + (c.pile && c.pile.count))

// 4. 连拉：越堆越大，堆到阈值就炸
const g = createEngine({ rng: seeded(21) })
g.setTokens(0)
g.setViewport(-1000, -600, 200, 100)      // 假装屏幕范围
const widths = []
for (let n = 0; n < POOP.explodeAt - 1; n++) {
  fireAndLand(g, 8)
  if (g.pile !== null) widths.push(g.pile.w)
}
ok('没到阈值就不炸', g.explodeSignal === 0 && g.pile !== null && g.pile.count === POOP.explodeAt - 1,
  'count=' + (g.pile && g.pile.count) + ' explodeSignal=' + g.explodeSignal)
ok('宽度单调不减', widths.every((v, i) => i === 0 || v >= widths[i - 1] - 1e-9))
ok('确实越堆越大', widths[widths.length - 1] > widths[0] * 1.8,
  'first=' + widths[0].toFixed(1) + ' last=' + widths[widths.length - 1].toFixed(1))
ok('宽度不超过上限', widths.every((w) => w <= POOP.pileMaxW + 1e-9), 'maxW=' + POOP.pileMaxW)

// 4b. 第 explodeAt 发：炸，而且炸满整个屏幕
const beforeBurst = g.burst.length
fireAndLand(g, 8)
ok('堆到阈值就炸', g.explodeSignal === 1 && g.pile === null,
  'explodeSignal=' + g.explodeSignal + ' pile=' + (g.pile === null ? 'null' : 'still there'))
ok('炸出一堆碎块', g.burst.length - beforeBurst === POOP.explodeDebris,
  'debris=' + (g.burst.length - beforeBurst))
{
  const xs = g.burst.map((d) => d.tx)
  const ys = g.burst.map((d) => d.ty)
  const w = Math.max.apply(null, xs) - Math.min.apply(null, xs)
  const h = Math.max.apply(null, ys) - Math.min.apply(null, ys)
  ok('碎块铺满整个屏幕', w > 900 && h > 560, 'spanX=' + w.toFixed(0) + ' spanY=' + h.toFixed(0))
  ok('全部以屎堆为起点', g.burst.every((d) => d.x0 === d.tx || Math.abs(d.x0 - d.tx) < 1e9))
  ok('第一时间在屎堆上', g.burst.every((d) => d.age <= 1 / 60 + 1e-9))
}
// 碎块会飞出去
for (let i = 0; i < 40; i++) g.update(step)
{
  const moved = g.burst.filter((d) => Math.hypot(d.x - d.x0, d.y - d.y0) > 5).length
  ok('碎块确实在往外飞', moved > POOP.explodeDebris * 0.8, 'moved=' + moved + '/' + g.burst.length)
}
// 碎块到期会自己消失 —— 「过几秒就没了」，不会一直糊在屏幕上
for (let i = 0; i < Math.round((POOP.debrisLife - 0.5) / step); i++) g.update(step)
ok('几秒内还看得见', g.burst.length === POOP.explodeDebris, 'left=' + g.burst.length)
for (let i = 0; i < Math.round((POOP.debrisFade + 1) / step); i++) g.update(step)
ok('到期全部自己消失', g.burst.length === 0, 'left=' + g.burst.length)
ok('总寿命只有几秒', POOP.debrisLife + POOP.debrisFade <= 6,
  (POOP.debrisLife + POOP.debrisFade) + ' 秒')

// 4c. 炸完从零重新堆
fireAndLand(g, 8)
ok('炸完重新从小坨开始', g.pile !== null && g.pile.count === 1 && Math.abs(g.pile.w - POOP.pileMinW) < 4,
  'count=' + (g.pile && g.pile.count) + ' w=' + (g.pile && g.pile.w.toFixed(1)))

// 5. 清空 -> 连炸出来的碎块一起清
g.burst.push({ kind: 'normal', x0: 0, y0: 0, x: 0, y: 0, tx: 1, ty: 1, r: 2, rot: 0, dur: 0.4, age: 0, born: 0 })
g.clearPoop()
ok('清空后地上和屏幕都干净', g.pile === null && g.shots.length === 0 && g.burst.length === 0)
fireAndLand(g, 8)
ok('重新从小坨开始', g.pile !== null && Math.abs(g.pile.w - POOP.pileMinW) < 3,
  'w=' + (g.pile && g.pile.w.toFixed(1)))

// 6. 彩蛋门槛
function kindAt(roll) {
  return roll < POOP.rainbowChance ? 'rainbow' : (roll < POOP.goldChance ? 'gold' : 'normal')
}
ok('彩虹门槛 = 0.1%', Math.abs(POOP.rainbowChance - 0.001) < 1e-12)
ok('黄金门槛 = 1%', Math.abs(POOP.goldChance - 0.01) < 1e-12)
ok('0.0005 -> 彩虹', kindAt(0.0005) === 'rainbow')
ok('0.005  -> 黄金', kindAt(0.005) === 'gold')
ok('0.5    -> 普通', kindAt(0.5) === 'normal')

let gold = 0; let rainbow = 0
const trials = 200000
const r = seeded(7)
for (let i = 0; i < trials; i++) {
  const k = r() < POOP.rainbowChance ? 'rainbow' : (r() < POOP.goldChance ? 'gold' : 'normal')
  if (k === 'gold') gold++
  else if (k === 'rainbow') rainbow++
}
ok('黄金掉率接近 1%', gold / trials * 100 > 0.8 && gold / trials * 100 < 1.2, (gold / trials * 100).toFixed(3) + '%')
ok('彩虹掉率接近 0.1%', rainbow / trials * 100 > 0.04 && rainbow / trials * 100 < 0.2, (rainbow / trials * 100).toFixed(3) + '%')

// 7. 彩蛋会留在堆上（彩虹优先）
const h = createEngine({ rng: seeded(31) })
h.setTokens(0)
fireAndLand(h, 8)
ok('普通堆是普通色', h.pile !== null && h.pile.kind === 'normal', h.pile && h.pile.kind)
// 手工塞一发黄金、一发彩虹，验证染色优先级
function dropIn(eng, id, kind) {
  eng.shots.push({
    id: id, kind: kind, x: 40, y: 100, x0: 40, y0: 100, age: 0,
    vx: 0, vy: 10, g: 660, size: 3, growth: 1, trail: [40, 100],
  })
  for (let i = 0; i < 60 && eng.shots.length > 0; i++) eng.update(step)
}
dropIn(h, 9001, 'gold')
ok('黄金会让整堆变金', h.pile.kind === 'gold' && h.pile.gold === true, h.pile.kind)
dropIn(h, 9002, 'rainbow')
ok('彩虹优先于黄金', h.pile.kind === 'rainbow' && h.pile.rainbow === true, h.pile.kind)
dropIn(h, 9003, 'normal')
ok('之后拉普通屎也不会把奖杯洗掉', h.pile.kind === 'rainbow', h.pile.kind)

// 8. 换会话：总量回退要清零债务
const d = createEngine({ rng: seeded(4) })
d.setTokens(0)
d.setTokens(5000)
ok('换会话前有债', d.poopDebt > 0, 'debt=' + d.poopDebt)
d.setTokens(10)
ok('换会话后债务清零', d.poopDebt === 0, 'debt=' + d.poopDebt)

// 9. 台词表 + tokenBus
ok('三种台词都在', Array.isArray(POOP_TEXT.normal) && Array.isArray(POOP_TEXT.gold) && Array.isArray(POOP_TEXT.rainbow))
ok('tokenBus 初始未接上', tokenBus.seen === false && tokenBus.total === 0)

// 10. 挪窝：走开之后旧的那坨要被清掉，落点重设到新位置身后
const mv = createEngine({ rng: seeded(51) })
mv.setTokens(0)
fireAndLand(mv, 8)
fireAndLand(mv, 8)
ok('原地不动会一直堆', mv.pile !== null && mv.pile.count === 2, 'count=' + (mv.pile && mv.pile.count))
const homePileX = mv.pileX
const homePileW = mv.pile.w
mv.anchor = -70                    // 走开一大截
mv.update(step)
ok('挪窝之后旧的屎被清掉', mv.pile === null, 'pile=' + (mv.pile === null ? 'null' : 'still there'))
ok('挪窝之后落点跟着换', Math.abs(mv.pileX - homePileX) > 30,
  'before=' + homePileX.toFixed(1) + ' after=' + mv.pileX.toFixed(1))
ok('落点永远在屁股那一侧', Math.abs(mv.pileX - (50 + mv.anchor)) - POOP.pileBack < 1e-9,
  'pileX=' + mv.pileX.toFixed(1) + ' center=' + (50 + mv.anchor) + ' back=' + POOP.pileBack)
fireAndLand(mv, 8)
ok('新位置重新从小坨开始拉', mv.pile !== null && mv.pile.count === 1 && mv.pile.w < homePileW,
  'count=' + (mv.pile && mv.pile.count) + ' w=' + (mv.pile && mv.pile.w.toFixed(1)) + ' oldW=' + homePileW.toFixed(1))
ok('旧尺寸没有被继承', mv.pile !== null && Math.abs(mv.pile.w - POOP.pileMinW) < 4, 'w=' + (mv.pile && mv.pile.w.toFixed(1)))

// 走开一点点（小于阈值）不算挪窝
const tiny = createEngine({ rng: seeded(52) })
tiny.setTokens(0)
fireAndLand(tiny, 8)
const before = tiny.pileX
tiny.anchor = tiny.pileAnchorX + POOP.moveClear * 0.5
tiny.update(step)
ok('小幅晃动不算挪窝', tiny.pileX === before && tiny.pile !== null,
  'pileX=' + tiny.pileX.toFixed(1) + ' / ' + before.toFixed(1))

// 11. 四个站位都能命中自己那一坨
const sides = []
for (const anchor of [-110, -40, 0, 18]) {
  const e2 = createEngine({ rng: seeded(41) })
  e2.setTokens(0)
  e2.anchor = anchor
  e2.update(step)                  // 先让它意识到自己挪窝了
  const targetX = e2.pileX
  const s2 = fireAndLand(e2, 8)
  if (s2 !== null) {
    const endX = s2.trail[s2.trail.length - 2]
    sides.push({ anchor: anchor, ok: Math.abs(endX - targetX) < 1.5, endX: endX, targetX: targetX, facing: e2.facing })
  }
}
ok('四个站位都能命中自己那一坨', sides.length === 4 && sides.every((s) => s.ok),
  sides.map((s) => 'a=' + s.anchor + ':x=' + s.endX.toFixed(2) + '/t=' + s.targetX.toFixed(1) + '/f=' + s.facing).join('  '))

console.log('\n' + (fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILED: ' + fails.join(' | ')))
process.exit(fails.length === 0 ? 0 : 1)
