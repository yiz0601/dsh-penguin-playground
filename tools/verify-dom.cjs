// 用极小的 DOM 替身跑 syncPoopLayer，验证：
//   · 飞行中画的是「整条抛物线」（SVG 折线 + 前端一颗头），没有表情
//   · 落地堆成**唯一的一坨**（不管拉多少发，地上只有一个节点），尺寸随发数长大
//   · 坐标从 viewBox 单位换算到屏幕像素；节点按 id 复用、消失的会回收
global.window = { __ModuleLoader__: { load(def) { global.__def = def } } }
require('../lib/client.js')
const { createEngine, syncPoopLayer, POOP } = global.__def.factory(() => ({})).__internals

function makeEl(tag) {
  const el = {
    tagName: tag,
    className: '',
    textContent: '',
    children: [],
    parent: null,
    removed: false,
    attrs: {},
    style: new Proxy({}, { set(t, k, v) { t[k] = v; return true }, get(t, k) { return t[k] } }),
    setAttribute(n, v) { this.attrs[n] = String(v); if (n === 'class') this.className = String(v) },
    getAttribute(n) { return this.attrs[n] },
    appendChild(c) { c.parent = this; this.children.push(c); return c },
    remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null },
  }
  return el
}
global.document = { createElement: (tag) => makeEl(tag), createElementNS: (_ns, tag) => makeEl(tag) }
global.window.setTimeout = () => 0
global.window.innerWidth = 1280
global.window.innerHeight = 800

// 屎层是独立的 body 子节点，所以这里也单独造一个（不再复用企鹅容器）
function makeLayer() {
  const el = makeEl('div')
  el.className = 'dsh-pg-poop-layer'
  el.childCount = () => el.children.length
  el.countByClass = (prefix) => el.children.filter((c) => c.className.indexOf(prefix) === 0).length
  el.findByClass = (prefix) => el.children.find((c) => c.className.indexOf(prefix) === 0) || null
  return el
}

const fails = []
const ok = (label, cond, extra) => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra === undefined ? '' : '   ' + extra))
  if (!cond) fails.push(label)
}
function hasText(node) {
  if (node.textContent !== '' && node.textContent !== undefined) return true
  return node.children.some(hasText)
}

const HOST = { getBoundingClientRect: () => ({ left: 300, top: 500, width: 68, height: 82 }) }
const seed = (s0) => { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const step = 1 / 60

const eng = createEngine({ rng: seed(11) })
const layer = makeLayer()

syncPoopLayer(layer, eng, HOST)
ok('没有屎时不建节点', layer.childCount() === 0, 'children=' + layer.childCount())

// —— 飞行中 ——
// 节点按 id 复用，所以飞完之后 path 上留着最后一帧的完整弧线，直接读它。
eng.setTokens(0)
eng.poopNow()
for (let i = 0; i < 60 * 12 && eng.shots.length === 0; i++) eng.update(step)
let captured = null
for (let i = 0; i < 60 * 8 && eng.shots.length > 0; i++) {
  eng.update(step)
  syncPoopLayer(layer, eng, HOST)
  if (eng.shots.length > 0) {
    const root = layer.children[0]
    captured = {
      root: root,
      thick: root.children[0],
      mid: root.children[1],
      thin: root.children[2],
      head: root.children[3],
    }
  }
}
arcRoot = captured.root
arcPath = captured.thin
arcHead = captured.head
const arcThick = captured.thick
const arcMid = captured.mid
ok('飞行中建出了节点', arcRoot !== null)
ok('节点是 SVG（不是带表情的字形）', arcRoot.tagName === 'svg', arcRoot.tagName)
ok('画的是弧线路径', arcPath.getAttribute('class') === 'dsh-pg-arc-path')
ok('弧线是折线路径且起点为 M', /^M[-\d.]+ [-\d.]+(L[-\d.]+ [-\d.]+)+$/.test(arcPath.getAttribute('d') || ''))
ok('前端有一颗头', arcHead.getAttribute('class') === 'dsh-pg-arc-head')
ok('头半径随尺寸>0', parseFloat(arcHead.getAttribute('r')) > 0, arcHead.getAttribute('r'))
ok('整条弧没有任何文字/表情', !hasText(arcRoot))
{
  const wThick = parseFloat(arcThick.getAttribute('stroke-width'))
  const wMid = parseFloat(arcMid.getAttribute('stroke-width'))
  const wThin = parseFloat(arcPath.getAttribute('stroke-width'))
  ok('三条叠出锥度：根粗 → 尖细', wThick > wMid && wMid > wThin,
    wThick + ' > ' + wMid + ' > ' + wThin)
  ok('粗的那条只覆盖根部（更短）',
    arcThick.getAttribute('d').split('L').length < arcPath.getAttribute('d').split('L').length,
    'rootPts=' + arcThick.getAttribute('d').split('L').length + ' fullPts=' + arcPath.getAttribute('d').split('L').length)
}
{
  const pts = arcPath.getAttribute('d').slice(1).split('L').map((p) => p.trim().split(' ').map(Number))
  const ys = pts.map((p) => p[1])
  const apex = Math.min.apply(null, ys)
  ok('采到了足够多的点', pts.length >= 8, 'points=' + pts.length)
  ok('轨迹是先上后下的拱形', apex < ys[0] - 3 && ys[ys.length - 1] > apex + 3,
    'y0=' + ys[0].toFixed(1) + ' apex=' + apex.toFixed(1) + ' yEnd=' + ys[ys.length - 1].toFixed(1))
  const pileScreenX = 300 + eng.pileX * 0.68
  // 最后一帧离落地还差一步（一帧 ≈ 2.6px），所以允许差一帧的路程。
  // 方向不写死左右：v1.4 起模型本体朝左（flip 静止值 -1），堆可能在左也可能在右，
  // 所以判据是「每一步都朝屎堆推进」+「落点就是屎堆」。
  const toward = Math.sign(pileScreenX - pts[0][0]) || 1
  let monotonic = true
  for (let i = 1; i < pts.length; i++) {
    if ((pts[i][0] - pts[i - 1][0]) * toward < -0.01) monotonic = false
  }
  ok('弧线一路朝着屎堆推进', monotonic
    && Math.abs(pts[pts.length - 1][0] - pileScreenX) < 4,
    'x0=' + pts[0][0] + ' xEnd=' + pts[pts.length - 1][0] + ' pileScreenX=' + pileScreenX.toFixed(1))
}

// —— 落地：只有一坨 ——
for (let i = 0; i < 60 * 4 && eng.shots.length > 0; i++) { eng.update(step); syncPoopLayer(layer, eng, HOST) }
ok('飞行节点被回收', layer.countByClass('dsh-pg-shot') === 0)
ok('地上只有一坨', layer.countByClass('dsh-pg-splat') === 1, 'piles=' + layer.countByClass('dsh-pg-splat'))
const pileRoot = layer.children[0]
ok('只有一坨（子节点 = 一个 svg）', pileRoot.children.length === 1, 'kids=' + pileRoot.children.length)
const moundSvg = pileRoot.children[0]
ok('那一坨是 SVG', moundSvg.tagName === 'svg' && moundSvg.getAttribute('class') === 'dsh-pg-mound-svg')
ok('有一个软包路径', moundSvg.children[0].getAttribute('class') === 'dsh-pg-mound')
ok('有一块高光', moundSvg.children[1].getAttribute('class') === 'dsh-pg-mound-hi')
ok('那一坨也没有表情', !hasText(moundSvg))
const w1 = parseFloat(moundSvg.style.width)
ok('宽度在合理区间', w1 >= POOP.pileMinW - 3 && w1 <= POOP.pileMaxW, 'width=' + w1 + 'px')
ok('宽高比 3:2', Math.abs(parseFloat(moundSvg.style.height) - w1 * 2 / 3) < 0.2)

// —— 关键：连拉 20 发，地上依然只有一个节点，而且越堆越大 ——
function fireAndLand() {
  eng.poopNow()
  let launched = false
  for (let i = 0; i < 60 * 8; i++) {
    eng.update(step)
    syncPoopLayer(layer, eng, HOST)
    if (eng.shots.length > 0) launched = true
    if (launched && eng.shots.length === 0) return true
  }
  return false
}

const widths = [w1]
const frontEdges = []
for (let n = 0; n < POOP.explodeAt - 3; n++) {
  fireAndLand()
  syncPoopLayer(layer, eng, HOST)
  const kid = layer.findByClass('dsh-pg-splat')
  if (kid === null) break
  const kw = parseFloat(kid.children[0].style.width)
  widths.push(kw)
  const m = /translate\(([-\d.]+)px/.exec(kid.style.transform)
  if (m !== null) frontEdges.push(parseFloat(m[1]) + eng.pile.face * kw / 2)
  if (layer.countByClass('dsh-pg-splat') !== 1 || layer.countByClass('dsh-pg-shot') !== 0) {
    ok('第 ' + n + ' 发之后仍然只有一坨', false,
      'piles=' + layer.countByClass('dsh-pg-splat') + ' shots=' + layer.countByClass('dsh-pg-shot'))
  }
}
ok('堆长胖是往身后长：前缘位置恒定', frontEdges.length > 8
  && frontEdges.every((x) => Math.abs(x - frontEdges[0]) < 0.05),
  'front=' + frontEdges[0].toFixed(2) + ' .. ' + frontEdges[frontEdges.length - 1].toFixed(2))
// 方向不写死左右：堆在企鹅的「背面」（与 facing 相反一侧），前缘离身体中心至少 pileBack
const behindPx = (eng.pileX - (50 + eng.anchor)) * 0.68
ok('前缘在企鹅身后（不会贴到身上）',
  Math.abs(behindPx) >= POOP.pileBack * 0.68 - 1 && behindPx * eng.facing < 0,
  'front=' + frontEdges[0].toFixed(1) + ' behind=' + behindPx.toFixed(1) + ' facing=' + eng.facing)
ok('地上始终只有一个节点', layer.countByClass('dsh-pg-splat') === 1, 'piles=' + layer.countByClass('dsh-pg-splat'))
ok('那一坨越堆越大', widths[widths.length - 1] > widths[0],
  'first=' + widths[0].toFixed(1) + ' last=' + widths[widths.length - 1].toFixed(1))
ok('宽度不超过上限', widths.every((w) => w <= POOP.pileMaxW + 1e-9))
{
  // 快到阈值时那一坨会带 critical class（发抖预警）
  const pileNode = layer.findByClass('dsh-pg-splat')
  const threshold = POOP.explodeAt * POOP.explodeWarn
  ok('接近阈值时进入预警状态', eng.pile.count >= threshold
    ? pileNode.className.indexOf('critical') > 0
    : pileNode.className.indexOf('critical') < 0,
    'count=' + eng.pile.count + ' / warnAt=' + threshold.toFixed(0) + ' class="' + pileNode.className + '"')
}

// —— 爆炸：堆到阈值 -> 铺满整个屏幕 ——
const sigBefore = eng.explodeSignal
while (eng.explodeSignal === sigBefore) {
  fireAndLand()
  syncPoopLayer(layer, eng, HOST)
}
syncPoopLayer(layer, eng, HOST)
ok('炸了', eng.explodeSignal === sigBefore + 1, 'signal=' + eng.explodeSignal)
ok('屎堆没了', layer.countByClass('dsh-pg-splat') === 0, 'piles=' + layer.countByClass('dsh-pg-splat'))
ok('屏幕上全是碎块', layer.countByClass('dsh-pg-debris') === POOP.explodeDebris,
  'debris=' + layer.countByClass('dsh-pg-debris') + '/' + POOP.explodeDebris)
// 碎块会粘住不动，然后到寿命消失
for (let i = 0; i < 60; i++) { eng.update(step); syncPoopLayer(layer, eng, HOST) }
ok('碎块落地后还在', layer.countByClass('dsh-pg-debris') === POOP.explodeDebris,
  'debris=' + layer.countByClass('dsh-pg-debris'))
{
  // 飞完之后才量跨度
  const xs = layer.children.filter((c) => c.className.indexOf('dsh-pg-debris') === 0)
    .map((c) => parseFloat(/translate\(([-\d.]+)px/.exec(c.style.transform)[1]))
  const span = Math.max.apply(null, xs) - Math.min.apply(null, xs)
  ok('碎块横跨大半块屏', span > 400, 'span=' + span.toFixed(0) + 'px (屏幕宽 1280)')
}
{
  const first = layer.children.find((c) => c.className.indexOf('dsh-pg-debris') === 0)
  const a = first.style.transform
  for (let i = 0; i < 30; i++) { eng.update(step); syncPoopLayer(layer, eng, HOST) }
  ok('停下之后就不动了', first.style.transform === a)
}
eng.clearPoop()
syncPoopLayer(layer, eng, HOST)
ok('清空后连碎块一起收干净', layer.childCount() === 0, 'children=' + layer.childCount())

// 重新拉一坨，继续验彩蛋与图层
fireAndLand()
syncPoopLayer(layer, eng, HOST)
ok('炸完还能重新堆', eng.pile !== null, 'pile=' + (eng.pile === null ? 'null' : 'ok'))

// —— 彩蛋样式类 ——
eng.pile.rainbow = true
eng.pile.kind = 'rainbow'
eng.pile.count++
syncPoopLayer(layer, eng, HOST)
ok('彩虹堆带 rainbow class', layer.children[0].className.indexOf('rainbow') > 0, layer.children[0].className)
eng.pile.rainbow = false
eng.pile.gold = true
eng.pile.kind = 'gold'
eng.pile.count++
syncPoopLayer(layer, eng, HOST)
ok('黄金堆带 gold class', layer.children[0].className.indexOf('gold') > 0, layer.children[0].className)

// —— 清空 / 图层换新 / 零尺寸 ——
eng.clearPoop()
syncPoopLayer(layer, eng, HOST)
ok('清空后节点全部回收', layer.childCount() === 0, 'children=' + layer.childCount())

syncPoopLayer(makeLayer(), eng, { getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) })
ok('零尺寸舞台不抛异常', true)

eng.poopNow()
for (let i = 0; i < 60 * 6 && eng.pile === null; i++) eng.update(step)
syncPoopLayer(layer, eng, HOST)
const oldNode = layer.children[0]
const fresh = makeLayer()
syncPoopLayer(fresh, eng, HOST)
ok('图层换新后节点建在新图层上', fresh.childCount() === 1, 'children=' + fresh.childCount())
ok('新图层上的节点不是旧节点', fresh.children[0] !== oldNode)
ok('旧节点被移除', oldNode.removed === true)

// —— 切回旧图层要继续可用（缓存不能指向已废弃的图层） ——
syncPoopLayer(layer, eng, HOST)
ok('切回旧图层后仍然只有一坨', layer.countByClass('dsh-pg-splat') === 1, 'piles=' + layer.countByClass('dsh-pg-splat'))

console.log('\n' + (fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILED: ' + fails.join(' | ')))
process.exit(fails.length === 0 ? 0 : 1)
