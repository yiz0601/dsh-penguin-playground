window.__ModuleLoader__.load({
  id: 'dsh-penguin-playground',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    const React = require('react')
    const ReactDOMClient = require('react-dom/client')

    /* ==================================================================
     * 0. 文案与状态表
     * ================================================================== */
    const QUOTES = [
      '嘎！今天的会话也很顺滑。',
      '本鹅已检阅：这片冰原没有鱼。',
      '小心，冰面很滑——但代码可以大胆写。',
      '南极信号满格，嘎。',
      '我梦见了一片没有 bug 的冰原。',
      '嘘，人类在敲代码，本鹅在打盹。',
      '企鹅生存守则：掉进 bug 海里要会游泳。',
      '巴布亚企鹅走路最像人类，所以我走得慢。',
      '橘色的嘴是身份证，白色的眼罩是时尚。',
    ]
    const ACTION_WORDS = {
      hop: ['嘎！', '好耶！', '鱼！', '哇！', '咕噜！', '嘎嘎！'],
      call: ['嘎——！', '嘎嘎嘎！', '听得到吗！'],
      peck: ['哆哆哆！', '笃笃！', '啄！啄！'],
      slide: ['滑——！', '呜呼！', '肚皮最省力！'],
      preen: ['整理一下羽毛。', '本鹅要漂漂亮亮的。'],
    }
    const STATUS_TEXT = {
      idle: '发呆中',
      wander: '散步中',
      sleep: '打盹中',
      slide: '肚皮滑行',
      call: '正在叫唤',
      peck: '正在啄地',
      preen: '梳理羽毛',
      hop: '蹦跳中',
      drag: '被拎起来了',
      fall: '正在落地',
      wake: '刚睡醒',
      poop: '正在拉屎',
    }
    const CLICK_ACTIONS = ['hop', 'hop', 'call', 'peck', 'slide', 'preen']

    // 拉屎的台词。rare 那两组是 1% / 0.1% 的彩蛋掉落。
    const POOP_TEXT = {
      normal: ['噗——！', '咕叽。', '嘘……', '解决一下。', '嘎。（舒畅）', '腾个地方。'],
      gold: ['黄金屎！！', '哇！是金的！', '嘎嘎嘎！中大奖了！'],
      rainbow: ['彩虹屎！！！', '这……这不科学！', '嘎——！！传说级掉落！'],
      blast: ['💥 炸了！！', '💥 噗——！！', '💥 憋不住了！！！'],
    }

    /* ---------------- 企鹅弹道学 ----------------
     * 巴布亚企鹅是真正意义上的「投射型」选手：前倾、抬尾、把粪便以
     * 抛物线喷向身后（实测能喷出接近半个身长）。这里照抄那套动作：
     * 预备（前倾抬尾）→ 发射（尾部一顶，抛物线出手）→ 收尾（抖一抖）。
     *
     * 区别是：**所有屎都瞄准同一个落点**，所以地上只会堆出一坨，
     * 而不是散成一片。出手速度反解出来 —— 给定落点、重力、飞行时间，
     * vx = dx/T、vy = (dy - gT²/2)/T，轨迹依然是纯正的抛物线。
     *
     * 坐标系和 SVG viewBox 一致（100 x 120，地面在 y≈108）。
     */
    const POOP = {
      ground: 108,          // 地面高度
      gravity: 2200,        // 重力（单位/秒²）—— 故意给得很大：喷出去是「一冲」而不是「抛投」
      flightBase: 0.2,      // 基础滞空（秒）
      flightPerUnit: 0.0013,// 每远一个单位多飞这么久
      flightMax: 0.42,      // 滞空上限
      pileX: 6,             // 屎堆落点 = 堆的**前缘**（pet 局部坐标）；挪窝时重设
      pileBack: 60,         // 前缘离企鹅中心多远（屁股那一侧）—— 刚好越过拖在地上的尾羽
      moveClear: 14,        // 企鹅离开原处超过这么多单位：清掉旧的，重新开张
      pileMinW: 16,         // 屎堆初始宽度（px）
      pileMaxW: 62,         // 屎堆最大宽度（px）—— 企鹅整个才 68px 宽
      tokensPerPoop: 900,   // 每攒够这么多 token 拉一坨
      maxDebt: 6,           // 债最多攒 6 坨，避免一次爆发刷屏
      minInterval: 1.15,    // 两坨之间最短间隔（秒）
      growthPerPoop: 0.05,  // 越拉越大：这一坨给屎堆加的量再乘上这个增幅
      maxGrowth: 1.5,       // 增幅封顶 2.5 倍
      goldChance: 0.01,     // 1% 黄金屎
      rainbowChance: 0.001, // 0.1% 彩虹屎
      idlePoopAfter: 42,    // 拿不到 token 数据时的兜底节奏（秒）
      // —— 拉屎的表演节奏（参考实拍：前半身趴低、屁股翘到最高，拉完抖一抖、摇几下屁股）——
      actionTime: 2.9,      // 一次拉屎动画的总时长（秒）：鼓劲 → 趴下抬尾 → 喷射 → 抖屁股 → 起身
      fireAt: 0.4,          // 喷出去的那一瞬间（占总时长的比例）
      shakeFrom: 0.5,       // 从这个比例开始「抖一抖 + 摇屁股」
      shakeWiggleHz: 2.6,   // 摇屁股的频率（关节弹簧偏软，太快的摆动会被吃掉）
      shakeShiverHz: 5.2,   // 发抖的频率（快而小，只给质感）
      shakeDecay: 1.8,      // 抖动衰减速度（越大停得越快）
      explodeAt: 40,        // 堆到这么多发就炸
      explodeWarn: 0.72,    // 到这个比例就开始「快炸了」的抖动预警
      explodeDebris: 46,    // 炸出来的碎块数
      debrisLife: 3,        // 碎块在屏幕上留几秒
      debrisFade: 1.2,      // 然后多久淡完
    }

    // 会话 token 用量的单向通道：投影 -> tokenBus -> 引擎。
    // 刻意不走 React state：token 是流式更新的，走 state 会把桌宠整棵树
    // 每一小段都重渲染一遍，而引擎本来就每帧都在跑。
    const tokenBus = { total: 0, seen: false }

    const PENGUIN_TOKENS = {
      '--dsw-alias-brand-primary': { light: '#e8600a', dark: '#fb923c' },
      '--dsw-alias-bg-base': { light: '#f4f8fc', dark: '#0a1322' },
      '--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#101c33' },
      '--dsw-specific-sidebar-fill': { light: '#e9f1f9', dark: '#0e1830' },
    }

    /* ==================================================================
     * 1. 角色：巴布亚企鹅（Gentoo penguin），正侧面的 2D 矢量造型
     *
     *    辨识特征（照着实拍照片来的）：
     *      · 头顶与背侧近乎黑色的深蓝灰，腹部纯白；
     *      · 眼睛后上方一块椭圆白斑，下缘盖到眼睛；额头与头顶保持全黑；
     *      · 喙是鲜亮的橘红色，细长、尖端略下弯，喙脊有一条黑线、喙基一道黑带；
     *      · 颊侧留黑，把白斑和白色喉部分开；脸上有细碎白色羽点；
     *      · 脚是偏粉的橘色蹼足，尾羽长而硬、向后拖在冰面上。
     *
     *    造型是一整段 SVG 字符串，每块可动部件都有 id（pg-*）。
     *    动画不是换贴图，而是每帧把关节角度写成 SVG transform —— 见第 2 节。
     * ================================================================== */
    const VIEW_W = 100
    const VIEW_H = 120

    const PENGUIN_SVG = [
      '<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">',
      '<defs>',
      // 背与头：深蓝灰，靠右上受光
      '<linearGradient id="pgBack" x1="26%" y1="6%" x2="76%" y2="96%">',
      '<stop offset="0%" stop-color="#4a5670"/><stop offset="34%" stop-color="#2b3547"/>',
      '<stop offset="70%" stop-color="#1b2331"/><stop offset="100%" stop-color="#121824"/>',
      '</linearGradient>',
      '<linearGradient id="pgHead" x1="34%" y1="2%" x2="72%" y2="98%">',
      '<stop offset="0%" stop-color="#525f7b"/><stop offset="40%" stop-color="#2c3749"/>',
      '<stop offset="100%" stop-color="#161d2a"/></linearGradient>',
      // 腹部：白，下缘带一点冷灰
      '<linearGradient id="pgBelly" x1="38%" y1="4%" x2="62%" y2="100%">',
      '<stop offset="0%" stop-color="#ffffff"/><stop offset="52%" stop-color="#f5f9fd"/>',
      '<stop offset="84%" stop-color="#dde8f4"/><stop offset="100%" stop-color="#c3d3e6"/>',
      '</linearGradient>',
      // 喙：橘红，上亮下暗
      '<linearGradient id="pgBeak" x1="10%" y1="0%" x2="30%" y2="100%">',
      '<stop offset="0%" stop-color="#ffc078"/><stop offset="42%" stop-color="#fb8624"/>',
      '<stop offset="100%" stop-color="#cf4f07"/></linearGradient>',
      '<linearGradient id="pgBeakLow" x1="10%" y1="0%" x2="30%" y2="100%">',
      '<stop offset="0%" stop-color="#f4871f"/><stop offset="100%" stop-color="#b8420a"/></linearGradient>',
      // 脚：偏粉的橘
      '<linearGradient id="pgFoot" x1="20%" y1="0%" x2="60%" y2="100%">',
      '<stop offset="0%" stop-color="#ffb289"/><stop offset="46%" stop-color="#f8804a"/>',
      '<stop offset="100%" stop-color="#cd5316"/></linearGradient>',
      // 鳍肢（翅膀）
      '<linearGradient id="pgFlipper" x1="18%" y1="0%" x2="82%" y2="100%">',
      '<stop offset="0%" stop-color="#3d4a63"/><stop offset="52%" stop-color="#222c3d"/>',
      '<stop offset="100%" stop-color="#121924"/></linearGradient>',
      '<linearGradient id="pgFlipperFar" x1="18%" y1="0%" x2="82%" y2="100%">',
      '<stop offset="0%" stop-color="#2c3648"/><stop offset="100%" stop-color="#0e141e"/></linearGradient>',
      // 头顶高光 / 身体右下暗部
      '<radialGradient id="pgGloss" cx="34%" cy="14%" r="62%">',
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.30"/>',
      '<stop offset="60%" stop-color="#ffffff" stop-opacity="0.05"/>',
      '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>',
      '<radialGradient id="pgShade" cx="72%" cy="86%" r="66%">',
      '<stop offset="0%" stop-color="#020817" stop-opacity="0.42"/>',
      '<stop offset="100%" stop-color="#020817" stop-opacity="0"/></radialGradient>',
      // 影子
      '<radialGradient id="pgShadowGrad" cx="50%" cy="50%" r="50%">',
      '<stop offset="0%" stop-color="#020817" stop-opacity="0.34"/>',
      '<stop offset="62%" stop-color="#020817" stop-opacity="0.18"/>',
      '<stop offset="100%" stop-color="#020817" stop-opacity="0"/></radialGradient>',
      // 嘴内
      '<linearGradient id="pgMouth" x1="0%" y1="0%" x2="0%" y2="100%">',
      '<stop offset="0%" stop-color="#8c2440"/><stop offset="100%" stop-color="#d1506a"/></linearGradient>',
      '</defs>',

      // 地面投影（不属于身体，跟着跳跃高度缩放）
      '<g id="pg-shadow"><ellipse cx="50" cy="110" rx="26" ry="6.2" fill="url(#pgShadowGrad)"/></g>',

      '<g id="pg-root">',
      // —— 尾巴：长而硬，向后拖在冰面上；巴布亚企鹅的尾羽带白边 ——
      '<g id="pg-tail">',
      '<path d="M42 82 C32 86 19 92 8 98 C10 100.6 13 101.4 16 100.4 C28 96.4 38 90.5 46 84.5 Z" fill="#151c29"/>',
      '<path d="M43 83.6 C34 87.6 24 92.6 15 97 C25 95.6 35 91.4 44 86.5 Z" fill="#cfdcec" opacity="0.5"/>',
      '</g>',

      // —— 身体（正侧面）：黑背 + 白前胸，鳍肢前缘有白边 ——
      '<g id="pg-body">',
      // 远侧鳍肢：静止时藏在身体后面，抬起来（张开双鳍）才露出来
      '<g id="pg-far-wing">',
      '<path d="M45 45 C38 52 34 64 34 76 C34.2 80.5 37.5 82 39.5 78.2 C43 69 44.5 54 45.5 46.5 Z" fill="url(#pgFlipperFar)"/>',
      '</g>',
      // 躯干：站姿侧影，腹部略向前挺、背线较直
      '<path d="M52 32 C62 32 69 41 71 55 C73 70 71 88 64 98 C58 105 46 106 40 102 C33 97 30 86 31 72 C32 55 37 38 45 33 Z" fill="url(#pgBack)"/>',
      // 背部高光（右上受光）与下缘暗部
      '<path d="M52 32 C58 32 63 35.5 66.5 42 C61 36.5 55 35 48.5 35.6 C43 36.1 38.5 38.5 35.5 42.5 C37.5 36.5 44 32 52 32 Z" fill="url(#pgGloss)"/>',
      '<path d="M52 32 C62 32 69 41 71 55 C72.6 68 71 82 65.5 91.5 C64 84 63.4 73 63 62 C62.4 49 58.5 38 52 32 Z" fill="url(#pgShade)"/>',
      // 白色前胸与腹部：从脖子一路连到肚子（下巴那一块留黑，白只从颈下开始）
      '<path d="M58 36 C66 40 69.5 51 70.5 63 C71.5 80 69 93 62 99 C57 103 49 104 43 102 C46 95 48 86 50 76 C52 62 53 45 58 36 Z" fill="url(#pgBelly)"/>',
      // 胸前羽纹：三道很轻的弧线
      '<g stroke="#b8cade" stroke-opacity="0.45" stroke-width="0.7" fill="none" stroke-linecap="round">',
      '<path d="M53 60 C56 58.6 59 58.4 61.4 59.2"/>',
      '<path d="M52 70 C55.4 68.4 59 68.2 61.8 69.2"/>',
      '<path d="M52 80 C55.6 78 59.6 77.8 62.6 79"/>',
      '</g>',
      // 近侧鳍肢：贴在体侧，前缘一条白边（照片里最显眼的那条）
      '<g id="pg-near-wing">',
      '<path d="M60 43 C68 49 72 64 71 78 C70.5 84 65 85.5 62.5 80 C58.5 70 57 54 57.5 45 Z" fill="url(#pgFlipper)"/>',
      '<path d="M58.6 45 C57.6 56 58.6 70 62 79.6 C59.6 70.6 58.4 56.6 58.6 45 Z" fill="#eaf2fb" opacity="0.92"/>',
      '<g stroke="#0d131d" stroke-opacity="0.4" stroke-width="0.6" fill="none" stroke-linecap="round">',
      '<path d="M66.6 70 C68.2 72.4 69.4 75 70 77.4"/>',
      '<path d="M64.4 75 C66 77.4 67.4 79.6 68.2 81.6"/>',
      '</g>',
      '</g>',
      '</g>',

      // —— 脚：侧面看是朝前的蹼足；远脚小一点靠在后面，近脚大一点踩在前面 ——
      '<g id="pg-foot-f">',
      '<path d="M44 100.4 C49 98.2 55 98.6 60 100.8 C62.4 101.8 63.2 103.4 62 104.8 C58.6 107.4 51.6 107.4 47.4 105.4 C44.4 103.9 42.6 101.6 44 100.4 Z" fill="url(#pgFoot)" opacity="0.9"/>',
      '<g stroke="#bd4c12" stroke-opacity="0.45" stroke-width="0.55" fill="none">',
      '<path d="M49 99.4 C50.4 101.2 51.6 103 52.4 104.8"/>',
      '<path d="M55 99.8 C56 101.4 57.2 103 58.2 104.6"/>',
      '</g>',
      '</g>',
      '<g id="pg-foot-n">',
      '<path d="M52 101.4 C58 98.6 66 99 72 101.6 C75.5 103 76.6 105 75 106.8 C71 110 62.6 110.2 56.6 108 C52 106.4 49.6 103 52 101.4 Z" fill="url(#pgFoot)"/>',
      '<g stroke="#b8480f" stroke-opacity="0.5" stroke-width="0.65" fill="none" stroke-linecap="round">',
      '<path d="M57 100.4 C58.6 102.4 60 104.6 61 106.8"/>',
      '<path d="M64 100.8 C65.4 102.8 66.8 104.8 67.8 106.8"/>',
      '<path d="M70.4 101.8 C71.4 103.4 72.4 105.2 73 106.8"/>',
      '</g>',
      '<path d="M52 101.4 C58 98.6 66 99 72 101.6" stroke="#ffd2b8" stroke-opacity="0.42" stroke-width="0.8" fill="none"/>',
      '</g>',

      // —— 头（正侧面，只露一只眼） ——
      '<g id="pg-head">',
      // 头形
      '<path d="M56 9 C65 9 72 16 72 25 C72 34 65 41 56 41 C47 41 40 34 40 25 C40 16 47 9 56 9 Z" fill="url(#pgHead)"/>',
      // 头顶高光
      '<path d="M56 9 C62 9 67 12.5 69.5 18 C65 13.5 59.5 12 53.5 12.6 C49 13.1 45.5 15 43.2 18 C45 13 50 9 56 9 Z" fill="url(#pgGloss)"/>',
      // 眼上白斑：竖长的椭圆，顶端顶到头顶附近 ——
      // 数值是手工微调过的（cx 56.8 / cy 17.3 / rx 4.4 / ry 7.9 / 倾角 -29°）
      '<ellipse cx="56.8" cy="17.3" rx="4.4" ry="7.9" transform="rotate(-29 56.8 17.3)" fill="#fdfeff"/>',
      // 脸上的白色羽点（参考图里那层细碎白点，做得很轻，只在脸颊和颈部）
      '<g fill="#eef4fa" opacity="0.32">',
      '<circle cx="47.6" cy="25.4" r="0.4"/><circle cx="51.6" cy="27.4" r="0.34"/>',
      '<circle cx="45" cy="29.4" r="0.36"/><circle cx="49.6" cy="31.6" r="0.4"/>',
      '<circle cx="54.4" cy="30.8" r="0.32"/><circle cx="47" cy="34" r="0.38"/>',
      '<circle cx="52.6" cy="35.2" r="0.34"/><circle cx="58" cy="33" r="0.36"/>',
      '<circle cx="62" cy="29.6" r="0.3"/><circle cx="44" cy="32.4" r="0.32"/>',
      '</g>',
      // 侧面视角看不到远侧那只眼睛：保留空组，引擎照旧往里写 transform
      '<g id="pg-eye-l"></g>',
      // 唯一可见的眼睛：位于白斑内偏下的位置。
      // 位置是手工微调过的：整组上移 3.7（等价于瞳孔中心 y 从 24.9 挪到 21.2），
      // 用组上的 transform 位移，瞳孔/眼睑会一起跟着走，眨眼原点也仍然正确。
      '<g id="pg-eye-r" transform="translate(0 -3.7)">',
      '<circle cx="58.8" cy="24.9" r="2.7" fill="#3a2415"/>',
      '<circle cx="58.8" cy="24.9" r="2.7" fill="none" stroke="#0d1119" stroke-opacity="0.45" stroke-width="0.5"/>',
      '<g id="pg-pupil-r"><circle cx="59.3" cy="25.3" r="1.85" fill="#0c0f15"/><circle cx="57.8" cy="23.6" r="0.72" fill="#ffffff" opacity="0.95"/></g>',
      '<g id="pg-lid-r"><circle cx="58.8" cy="24.9" r="2.8" fill="#1c2432"/><path d="M56.4 26.4 C57.6 27.3 60.2 27.3 61.3 26.2" stroke="#39455c" stroke-width="0.5" fill="none"/></g>',
      '</g>',
      '<g id="pg-lid-l"></g>',
      '<g id="pg-pupil-l"></g>',
      // 喙：正侧面的长橘喙，基本水平、尖端略下弯；喙脊一条黑线、喙基一道黑带（参考图特征）
      '<path d="M67.4 20.6 C73.4 20.4 79.8 21.4 86 24 C80.2 26.4 74 26.8 69.4 25.8 Z" fill="url(#pgBeak)"/>',
      '<path d="M68 20.9 C73.8 20.9 79.8 22.1 85.4 23.9" stroke="#141a24" stroke-opacity="0.88" stroke-width="1.05" fill="none"/>',
      '<path d="M68.4 20.9 C67.9 22.7 67.9 24.4 68.5 26.1" stroke="#141a24" stroke-opacity="0.45" stroke-width="0.9" fill="none"/>',
      '<path d="M69 23.2 C71.8 23.2 74.6 23.6 77.2 24.4" stroke="#a83c08" stroke-opacity="0.35" stroke-width="0.7"/>',
      '<path d="M68.2 25.6 C67.4 26.2 67.2 26.9 67.6 27.6" stroke="#5f2205" stroke-opacity="0.45" stroke-width="0.7" fill="none"/>',
      // 嘴内（画在下喙之前，闭上时被下喙挡住，张开时才露出来）
      '<path id="pg-mouth" d="M68 25.4 C73 25.6 78.6 26.8 84.6 28.8 C78.6 29.8 72.8 29.2 68 27.8 Z" fill="url(#pgMouth)" opacity="0"/>',
      '<g id="pg-beak-lower">',
      '<path d="M68.2 25.8 C73.8 26 79.6 27 84.2 28.8 C78.8 30.4 73 29.8 68 28.2 Z" fill="url(#pgBeakLow)"/>',
      '<path d="M68.8 28.2 C73.2 29 77.8 29 81.8 28.2" stroke="#7c2c06" stroke-opacity="0.45" stroke-width="0.6" fill="none"/>',
      '</g>',
      '</g>',

      // —— 情绪小件（打盹的 Z 和叫声的波纹） ——
      '<g id="pg-zzz" opacity="0">',
      '<path d="M70 8 H77 L70 15 H77" stroke="#8fa6c2" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M81 2.5 H86 L81 7.5 H86" stroke="#8fa6c2" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>',
      '</g>',
      '<g id="pg-wave" opacity="0">',
      '<circle cx="80" cy="30" r="4" fill="none" stroke="#fb923c" stroke-width="1.4" opacity="0.9"/>',
      '<circle cx="82" cy="30" r="8" fill="none" stroke="#fb923c" stroke-width="1" opacity="0.5"/>',
      '<circle cx="84" cy="30" r="12" fill="none" stroke="#fb923c" stroke-width="0.8" opacity="0.25"/>',
      '</g>',
      '</g>',
      '</svg>',
    ].join('')
    // React 自己就是 <svg> 的宿主，所以这里剥掉外层标签，只留内部结构
    const PENGUIN_INNER = PENGUIN_SVG.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')

    /* ==================================================================
     * 2. 关节引擎
     *
     *    旧实现是「四个角度帧硬切 + 320ms 跳格移动」，所以看起来一顿一顿。
     *    现在所有姿态都是一组关节角度，每帧用弹簧把当前值拉向目标值，再把
     *    关节写成 SVG transform。踏步、呼吸、眨眼、视线都叠加在这层之上，
     *    于是任何状态切换都是连续的，并且带一点回弹。
     * ================================================================== */

    // 每个关节的弹簧参数：k 越大越快，d 越小回弹越明显（d=1 接近临界阻尼）
    const SPRING = {
      x: { k: 150, d: 1.0 },
      y: { k: 230, d: 0.92 },
      rot: { k: 160, d: 0.62 },
      sx: { k: 200, d: 0.7 },
      sy: { k: 200, d: 0.7 },
      flip: { k: 62, d: 0.9 },
      bodySx: { k: 130, d: 0.88 },
      bodySy: { k: 130, d: 0.88 },
      bodyRot: { k: 140, d: 0.8 },
      headTx: { k: 140, d: 0.74 },
      headTy: { k: 140, d: 0.74 },
      headRot: { k: 130, d: 0.74 },
      wingN: { k: 160, d: 0.66 },
      wingF: { k: 160, d: 0.66 },
      wingSpread: { k: 150, d: 0.7 },
      footFx: { k: 300, d: 0.95 },
      footFy: { k: 300, d: 0.95 },
      footFr: { k: 260, d: 0.9 },
      footNx: { k: 300, d: 0.95 },
      footNy: { k: 300, d: 0.95 },
      footNr: { k: 260, d: 0.9 },
      tail: { k: 120, d: 0.75 },
      beak: { k: 520, d: 1.0 },
      lid: { k: 900, d: 1.0 },
      pupilX: { k: 320, d: 1.0 },
      pupilY: { k: 320, d: 1.0 },
      shadowSx: { k: 200, d: 0.95 },
      shadowSy: { k: 200, d: 0.95 },
      shadowOp: { k: 220, d: 1.0 },
      zzz: { k: 40, d: 1.0 },
      wave: { k: 90, d: 1.0 },
      waveScale: { k: 90, d: 1.0 },
    }

    const REST = {
      x: 0, y: 0, rot: 0, sx: 1, sy: 1, flip: 1,
      bodySx: 1, bodySy: 1, bodyRot: 0,
      headTx: 0, headTy: 0, headRot: 0,
      wingN: 0, wingF: 0, wingSpread: 0,
      footFx: 0, footFy: 0, footFr: 0,
      footNx: 0, footNy: 0, footNr: 0,
      tail: 0, beak: 0, lid: 1, pupilX: 0, pupilY: 0,
      shadowSx: 1, shadowSy: 1, shadowOp: 1,
      zzz: 0, wave: 0, waveScale: 1,
    }
    const JOINT_KEYS = Object.keys(REST)

    // 姿态：只写出与 REST 不同的关节
    const POSES = {
      stand: {},
      alert: { headRot: -3.5, headTy: -0.9, tail: -2 },
      crouch: { sy: 0.9, sx: 1.06, y: 2.6, headTy: 0.8, wingN: 7, wingF: 6, headRot: 2 },
      air: { sy: 1.03, sx: 0.98, wingN: -46, wingF: -38, wingSpread: 2.4, footNy: 3.4, footFy: 3.4, footNr: 12, footFr: -12, tail: -12 },
      land: { sx: 1.16, sy: 0.85, y: 3.2, wingN: -22, wingF: -16, wingSpread: 1.8, footNx: -1.6, footFx: 1.6, headRot: 3 },
      sleep: { sy: 0.965, sx: 1.025, y: 1.6, headRot: 27, headTy: 7.4, headTx: 1.6, lid: 0, wingN: 7, wingF: 6, tail: 5 },
      preen: { headRot: 30, headTx: -3.4, headTy: 4.6, tail: 2, sy: 0.99 },
      preenWing: { wingN: -30, wingSpread: 1.6 },
      call: { headRot: -30, headTy: -2.2, beak: 1, sy: 1.05, sx: 0.975, wingN: -13, wingF: -11, headTx: 1.2, tail: -5 },
      peck: { headRot: 47, headTy: 4.2, headTx: 1.4, y: 1.4, sy: 0.985, tail: -3, wingN: -4, wingF: -3 },
      // 肚皮滑行：身体压扁、脚往后甩、鳍肢后掠、头抬起来
      slide: {
        bodySy: 0.72, bodySx: 1.3, bodyRot: -3, y: 4.6, rot: -5,
        headTy: 20.5, headTx: 8, headRot: -15,
        wingN: 38, wingF: 32, wingSpread: 1.6,
        footNx: -15, footNy: -8, footNr: -30, footFx: -13, footFy: -8, footFr: -30,
        tail: -18,
      },
      dangle: { wingN: -58, wingF: -48, wingSpread: 3, footNy: 5.5, footFy: 5.5, footNr: 13, footFr: -13, tail: -6, headRot: -6 },
      // 拉屎：前半身趴低、屁股翘到最高（参考实拍：胸腹压低、尾羽竖起来、头往前探），
      // 只让躯干前倾（bodyRot），头和脚留在原地跟着补偿，这样脖子不会被拉长、脚也不离地。
      poop: {
        // 参考实拍：整体前倾（不压扁身体）、翅膀朝后、尾巴翘起来、头往前看
        rot: 22,                       // 整体像图里那样斜着站：前半身低、屁股那头高
        bodyRot: 14,                   // 躯干再拱一点，让背线更斜
        // 头跟着整体前倾一起走（不额外位移），只反向抬起来保持往前看
        headTx: 2, headTy: 2.6, headRot: -27,
        // 尾羽翘起来（整体前倾会吃掉约 22°，所以给到 60）
        tail: 60,
        // 翅膀朝后（正值 = 顺时针 = 向后掠）；整体前倾再加 22°，合成到接近水平偏上
        wingN: 76, wingF: 68, wingSpread: 2,
        // 脚原地踩住：抵消整体前倾带来的位移和旋转（否则脚会跟着歪）
        footNx: 8.6, footNy: -4, footNr: -22,
        footFx: 4, footFy: -0.4, footFr: -22,
        lid: 0.35,
      },
    }

    // 关节 -> SVG transform
    function around(cx, cy, op) {
      return 'translate(' + cx + ' ' + cy + ') ' + op + ' translate(' + (-cx) + ' ' + (-cy) + ')'
    }
    const n = (v) => (Math.abs(v) < 0.004 ? 0 : Math.round(v * 100) / 100)

    function poseToParts(p) {
      const transforms = {
        // 注意这里的顺序：SVG 的 transform 列表是从右往左作用到图形上的。
        // 镜像必须排在「姿态旋转」前面（= 作用得比它们晚），这样朝左时得到的是
        // 「把整个姿态镜像过去」，而不是「先镜像、再在屏幕空间里套一遍朝右的角度」——
        // 后者会让前倾、翅膀、尾巴在朝左时全部反向。
        'pg-root': 'translate(' + n(p.x) + ' ' + n(p.y) + ') '
          + around(50, 60, 'scale(' + n(p.flip) + ' 1)') + ' '
          + around(50, 106, 'scale(' + n(p.sx) + ' ' + n(p.sy) + ')') + ' '
          + around(50, 84, 'rotate(' + n(p.rot) + ')'),
        'pg-tail': 'rotate(' + n(p.tail) + ' 42 82)',
        'pg-body': around(50, 80, 'rotate(' + n(p.bodyRot) + ')') + ' '
          + around(50, 104, 'scale(' + n(p.bodySx) + ' ' + n(p.bodySy) + ')'),
        'pg-head': 'translate(' + n(p.headTx) + ' ' + n(p.headTy) + ') rotate(' + n(p.headRot) + ' 55 39)',
        'pg-far-wing': 'rotate(' + n(p.wingF) + ' 45 45) translate(' + n(-p.wingSpread) + ' ' + n(p.wingSpread * 0.4) + ')',
        'pg-near-wing': 'rotate(' + n(p.wingN) + ' 60 44) translate(' + n(p.wingSpread) + ' ' + n(p.wingSpread * 0.4) + ')',
        'pg-foot-f': 'translate(' + n(p.footFx) + ' ' + n(p.footFy) + ') rotate(' + n(p.footFr) + ' 53 102)',
        'pg-foot-n': 'translate(' + n(p.footNx) + ' ' + n(p.footNy) + ') rotate(' + n(p.footNr) + ' 63 104)',
        'pg-beak-lower': 'rotate(' + n(p.beak * 19) + ' 68.4 28.6)',
        // 眼睑：lid=1 是睁开（眼睑压成一条线），lid=0 是闭上（盖住眼睛），
        // 缩放原点放在眼睛上缘，所以闭上时是从上往下盖下来的
        'pg-lid-l': around(58.8, 22.6, 'scale(1 ' + n(1 - p.lid) + ')'),
        'pg-lid-r': around(58.8, 22.6, 'scale(1 ' + n(1 - p.lid) + ')'),
        'pg-pupil-l': 'translate(' + n(p.pupilX * 0.78) + ' ' + n(p.pupilY * 0.78) + ')',
        'pg-pupil-r': 'translate(' + n(p.pupilX) + ' ' + n(p.pupilY) + ')',
        // 影子要跟着身体一起平移，只受跳跃高度影响大小/浓淡
        'pg-shadow': 'translate(' + n(p.x) + ' ' + n(p.y * 0.34) + ') ' + around(50, 110, 'scale(' + n(p.shadowSx) + ' ' + n(p.shadowSy) + ')'),
        'pg-zzz': 'translate(' + n(p.zzz * 3) + ' ' + n(-p.zzz * 2.5) + ')',
        'pg-wave': around(84, 25, 'scale(' + n(p.waveScale) + ')'),
      }
      const opacities = {
        'pg-mouth': p.beak > 0.06 ? 1 : 0,
        'pg-shadow': p.shadowOp,
        'pg-zzz': p.zzz,
        'pg-wave': p.wave,
      }
      return { transforms, opacities }
    }

    /* ---------------- 随机数与工具 ---------------- */
    function makeRng(seed) {
      let s = (seed === undefined ? 1 : seed) >>> 0
      return function rng() {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 4294967296
      }
    }
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
    const lerp = (a, b, t) => a + (b - a) * t

    /* ---------------- 引擎 ---------------- */
    function createEngine(options) {
      const opt = options || {}
      const rng = opt.rng || Math.random
      const reduced = opt.reducedMotion === true
      const range = opt.range === undefined ? 96 : opt.range

      const cur = Object.assign({}, REST)
      const tgt = Object.assign({}, REST)
      const pose = Object.assign({}, REST)
      const vel = {}
      for (let i = 0; i < JOINT_KEYS.length; i++) vel[JOINT_KEYS[i]] = 0

      const eng = {
        t: 0,
        mode: 'idle',
        status: 'idle',
        anchor: 0,
        vx: 0,
        facing: 1,
        home: 0,
        bounds: { min: -range, max: range },
        pointer: null,
        pointerDist: 1e9,
        pointerAge: 99,
        hop: null,
        pendingJump: false,
        jumpAt: 0,
        landUntil: 0,
        fx: [],
        pose,
        phase: 0,
        lastStep: 0,
        lastSpray: 0,
        lastWave: 0,
        lastChip: 0,
        sleepStartedAt: 0,
        waveUntil: 0,
        modeEnds: 0,
        // 行为计时器
        nextBlink: 1.6,
        blinkStart: -9,
        blinkDur: 0.16,
        nextLook: 1.4,
        look: null,
        lookEnds: 0,
        idleCount: 0,
        wanderTarget: 0,
        wanderStopAt: 0,
        slideSpeed: 0,
        dragVx: 0,
        dragVy: 0,
        // —— 拉屎系统 ——
        tokenTotal: 0,        // 本次会话已知的 token 总量
        tokenSeen: false,     // 是否真的接到过 token 数据
        poopDebt: 0,          // 攒着还没拉的 token
        poopGrowthBase: 0,    // 「越拉越大」的起点：清空之后重新从小坨开始
        poopCount: 0,
        goldCount: 0,
        rainbowCount: 0,
        poopStartedAt: 0,
        poopFired: false,
        poopCooldown: 0,
        poopIdleAt: 0,        // 兜底节奏用
        poopEnabled: true,
        shots: [],            // 空中的（viewBox 坐标）
        pile: null,           // 地上那一坨（只有一坨，所有屎都堆在它上面）
        pileX: 6,             // 当前落点：跟着企鹅走，挪窝就重设
        pileAnchorX: 0,       // 立起这一坨时企鹅站在哪（用来判断「移动了」）
        rareSignal: 0,        // 彩蛋掉落信号，界面拿去喊话
        poopMoveSignal: 0,    // 挪窝清空信号
        explodeSignal: 0,     // 爆炸信号，界面拿去闪一下屏
        burst: [],            // 爆炸碎块（铺满整个屏幕）
        // 屏幕范围（pet 局部单位），由界面喂进来 —— 爆炸要炸满整块屏
        viewport: { minX: -900, maxX: 900, minY: -700, maxY: 200 },
        rareKind: null,
        rareAt: -99,
      }

      const MODE_MIN = { idle: 2.6, wander: 3.6, sleep: 16, slide: 3.2, peck: 2.4, call: 2.6, preen: 3.4, hop: 0.9, drag: 1e9, fall: 0.4, wake: 1.6, poop: POOP.actionTime }

      function setMode(mode, o) {
        const opts2 = o || {}
        if (eng.mode === mode && opts2.force !== true) return
        eng.mode = mode
        eng.status = mode
        const base = MODE_MIN[mode] === undefined ? 2 : MODE_MIN[mode]
        eng.modeEnds = eng.t + (opts2.duration === undefined ? base + rng() * base * 0.6 : opts2.duration)
        if (mode === 'wander') {
          let target = eng.home + (rng() * 2 - 1) * range * 0.88
          if (Math.abs(target - eng.anchor) < 18) target = eng.anchor + (rng() < 0.5 ? -1 : 1) * (26 + rng() * 40)
          eng.wanderTarget = clamp(target, eng.bounds.min, eng.bounds.max)
          eng.facing = eng.wanderTarget >= eng.anchor ? 1 : -1
          eng.wanderStopAt = eng.t + 2.5
        }
        if (mode === 'slide') eng.slideSpeed = 0
        if (mode === 'sleep') eng.sleepStartedAt = 0
      }
      eng.setMode = setMode

      function emit(kind, x, y, spread) {
        if (reduced) return
        eng.fx.push({
          kind,
          x: x === undefined ? 50 : x,
          y: y === undefined ? 108 : y,
          dx: (rng() * 2 - 1) * (spread === undefined ? 14 : spread),
          dy: -(4 + rng() * 12),
          s: 0.6 + rng() * 0.8,
        })
      }
      eng.emit = emit
      eng.takeFx = function takeFx() {
        if (eng.fx.length === 0) return null
        const out = eng.fx
        eng.fx = []
        return out
      }

      eng.setBounds = function setBounds(min, max) {
        eng.bounds.min = Math.min(min, max)
        eng.bounds.max = Math.max(min, max)
        eng.anchor = clamp(eng.anchor, eng.bounds.min, eng.bounds.max)
      }
      eng.setPointer = function setPointer(dirX, dirY, dist) {
        if (eng.pointer === null) eng.pointer = { x: dirX, y: dirY }
        else { eng.pointer.x = dirX; eng.pointer.y = dirY }
        eng.pointerDist = dist
        eng.pointerAge = 0
      }
      eng.clearPointer = function clearPointer() {
        eng.pointer = null
        eng.pointerDist = 1e9
      }
      eng.startDrag = function startDrag() {
        eng.hop = null
        eng.pendingJump = false
        setMode('drag', { force: true })
      }
      eng.endDrag = function endDrag(vx, vy) {
        eng.dragVx = clamp(vx || 0, -90, 90)
        eng.dragVy = vy || 0
        setMode('fall', { force: true, duration: 0.5 })
      }
      eng.poke = function poke(action) {
        setMode(action, { force: true })
      }
      eng.jump = function jump() {
        if (eng.hop !== null || eng.pendingJump) return
        eng.pendingJump = true
        eng.jumpAt = eng.t + 0.17          // 先蹲一下（预备动作）
        setMode('hop', { force: true, duration: 1e9 })
      }
      eng.wake = function wake() {
        if (eng.mode === 'sleep') {
          setMode('wake', { force: true })
          eng.nextBlink = eng.t + 1.2
        }
      }

      /* ---------------- 拉屎：把 token 债变成抛物线 ----------------
       * 三段式：预备（前倾抬尾）-> 发射（尾部一顶，出手）-> 收尾（抖两下）。
       * 所有屎都瞄准同一个落点（eng.pileX），所以地上只会堆出一坨。
       * 企鹅挪窝（走开超过 POOP.moveClear）时，旧的那坨直接清掉，
       * 落点重设到新位置的身后 —— 屎堆永远跟着企鹅。
       * 出手速度是反解出来的，轨迹仍是纯正抛物线，只是永远落在屎堆上。
       */

      // 会话 token 总量喂进来。只认「新烧掉的」增量：
      //   · 第一次拿到数据只做基线 —— 否则在长会话中途挂载（或热重载）会把
      //     之前烧掉的历史 token 一次性倒出来，瞬间铺满一地；
      //   · 总量回退说明换会话了，基线重来。
      eng.setTokens = function setTokens(total) {
        if (typeof total !== 'number' || !isFinite(total) || total < 0) return
        if (!eng.tokenSeen) {
          eng.tokenSeen = true
          eng.tokenTotal = total
          return
        }
        const prev = eng.tokenTotal
        if (total < prev - 1) {
          eng.tokenTotal = total
          eng.poopDebt = 0
          return
        }
        if (total <= prev) return
        eng.tokenTotal = total
        eng.poopDebt = Math.min(eng.poopDebt + (total - prev), POOP.tokensPerPoop * POOP.maxDebt)
      }

      /** 把屎堆的前缘安置到企鹅当前的身后（堆只会从这条线往身后长）。 */
      function anchorPile() {
        eng.pileAnchorX = eng.anchor
        eng.pileX = 50 + eng.anchor - POOP.pileBack * (eng.facing >= 0 ? 1 : -1)
      }
      // 挪窝：企鹅走开之后，旧的那坨不要了，落到新位置重新开张
      function checkPileMove() {
        if (Math.abs(eng.anchor - eng.pileAnchorX) <= POOP.moveClear) return
        const had = eng.pile !== null || eng.shots.length > 0
        eng.pile = null
        eng.shots.length = 0
        anchorPile()
        if (had) eng.poopMoveSignal++
      }

      function startPoop(force) {
        if (eng.mode === 'poop' && force !== true) return false
        if (force !== true) {
          if (eng.poopDebt < POOP.tokensPerPoop) return false
          eng.poopDebt -= POOP.tokensPerPoop
        }
        // 转身把屁股对准屎堆，再开始使劲（flip 走弹簧，正好用预备那 0.45 秒转过去）
        eng.facing = eng.pileX <= eng.anchor + 50 ? 1 : -1
        // 起跳途中被叫来拉屎：先把跳跃取消。
        // 否则跳跃落地时那句 setMode('idle') 会把整个拉屎动作顶掉，一发都放不出来。
        eng.hop = null
        eng.pendingJump = false
        eng.poopStartedAt = eng.t
        eng.poopFired = false
        eng.poopCooldown = POOP.minInterval
        setMode('poop', { force: true, duration: POOP.actionTime })
        return true
      }

      function launchPoop() {
        const facing = eng.facing >= 0 ? 1 : -1
        // 先摇彩虹（更稀有），再摇黄金，于是黄金稳定在 ~1%、彩虹 ~0.1%
        const kind = rng() < POOP.rainbowChance ? 'rainbow' : (rng() < POOP.goldChance ? 'gold' : 'normal')
        // 出手点：尾根
        const x = 50 - 9 * facing + eng.anchor
        const y = 84 + eng.pose.y
        // 反解出手速度，让它正好落在屎堆上；滞空给得很短，所以速度很冲
        const dx = eng.pileX - x
        const dy = POOP.ground - y          // 瞄准线和落地线必须是同一条，否则会差出几像素
        const T = clamp(POOP.flightBase + Math.abs(dx) * POOP.flightPerUnit, POOP.flightBase, POOP.flightMax)
        const vx = clamp(dx / T, -420, 420)
        const vy = (dy - 0.5 * POOP.gravity * T * T) / T
        // 越拉越大：这一坨是清空之后的第几坨，就给屎堆多加多少
        const already = Math.max(0, eng.poopCount - eng.poopGrowthBase)
        const growth = 1 + Math.min(POOP.maxGrowth, already * POOP.growthPerPoop)
        const shot = {
          id: eng.poopCount + 1,
          kind: kind,
          x: x,
          y: y,
          x0: x,                // 出手点：轨迹用解析解算，所以要把起点留着
          y0: y,
          age: 0,
          vx: vx,
          vy: vy,
          g: POOP.gravity,
          // 攒得越久（token 越多）这一道越粗
          size: 2.3 + rng() * 1.4 + Math.min(2.4, eng.poopDebt / POOP.tokensPerPoop),
          growth: growth,
          // trail 从出手点就开始记：飞行时画出来的就是这条抛物线本身
          trail: [x, y],
        }
        eng.shots.push(shot)
        eng.poopCount++
        if (kind !== 'normal') {
          eng.rareKind = kind
          eng.rareAt = eng.t
          eng.rareSignal++
          if (kind === 'gold') eng.goldCount++
          else eng.rainbowCount++
        }
        // 喷口那一股压力：多撒几粒，才有「噗」出来的感觉
        for (let i = 0; i < 3; i++) emit('spray', x, y, 9)
      }

      /** 界面每帧把屏幕范围换算成 pet 局部单位喂进来（爆炸要炸满整块屏）。 */
      eng.setViewport = function setViewport(minX, minY, maxX, maxY) {
        eng.viewport.minX = minX
        eng.viewport.maxX = Math.max(minX + 1, maxX)
        eng.viewport.minY = minY
        eng.viewport.maxY = Math.max(minY + 1, maxY)
      }

      /** 堆够了 —— 炸。碎块从屎堆沿各个方向冲到屏幕边缘，然后糊在屏幕上。 */
      function explodePile() {
        const pile = eng.pile
        if (pile === null) return
        const cx = pile.x
        const cy = pile.y
        const vp = eng.viewport
        for (let i = 0; i < POOP.explodeDebris; i++) {
          const ang = (i / POOP.explodeDebris) * Math.PI * 2 + rng() * 0.42
          const dx = Math.cos(ang)
          const dy = Math.sin(ang)
          // 这道射线打到屏幕边框的距离（slab 法），再取其中一段
          const tX = dx > 0 ? (vp.maxX - cx) / dx : (dx < 0 ? (vp.minX - cx) / dx : Infinity)
          const tY = dy > 0 ? (vp.maxY - cy) / dy : (dy < 0 ? (vp.minY - cy) / dy : Infinity)
          const reach = Math.min(tX, tY)
          const dist = reach * (0.34 + Math.sqrt(rng()) * 0.66)
          eng.burst.push({
            kind: pile.kind,
            x0: cx,
            y0: cy,
            x: cx,
            y: cy,
            tx: cx + dx * dist,
            ty: cy + dy * dist,
            r: 1.5 + rng() * 3.6,
            rot: (rng() * 2 - 1) * 180,
            dur: 0.36 + rng() * 0.42,
            age: 0,
            born: eng.t,
          })
        }
        eng.pile = null
        eng.burstAt = eng.t
        eng.explodeSignal++
        for (let i = 0; i < 6; i++) emit('spray', cx, cy, 22)
        eng.jump()                      // 自己被吓一跳
      }
      eng.explodePile = explodePile

      // 落地：不新增痕迹，而是把那一坨堆大。数量多了以后涨幅还会变大。
      function landPoop(shot) {
        // 堆得越高，每发加得越多 —— 但节奏放慢，让它刚好在爆炸前长到顶
        const inc = (0.42 + shot.size * 0.1) * shot.growth
        if (eng.pile === null) {
          eng.pile = {
            x: eng.pileX,
            face: eng.facing >= 0 ? 1 : -1,   // 前缘朝哪边：堆从这条线往身后长
            y: POOP.ground,
            w: POOP.pileMinW,
            count: 0,
            kind: 'normal',
            gold: false,
            rainbow: false,
            rot: (rng() * 2 - 1) * 6,
          }
        }
        const pile = eng.pile
        pile.count++
        pile.w = Math.min(POOP.pileMaxW, pile.w + inc)
        // 彩蛋会留在堆上（彩虹优先），当作一枚一直挂着的奖杯
        if (shot.kind === 'rainbow') pile.rainbow = true
        else if (shot.kind === 'gold') pile.gold = true
        pile.kind = pile.rainbow ? 'rainbow' : (pile.gold ? 'gold' : 'normal')
        // 堆到阈值就炸，炸完从零开始重新堆
        if (pile.count >= POOP.explodeAt) explodePile()
      }

      eng.clearPoop = function clearPoop() {
        eng.shots.length = 0
        eng.pile = null
        eng.burst.length = 0
        eng.poopDebt = 0
        // 地清空了，个头也重新从小坨开始长
        eng.poopGrowthBase = eng.poopCount
        anchorPile()
      }
      // 设置页 / 状态栏的测试按钮：不欠债也硬来一坨。
      // 正在预备（还没出手）时连点不会打断，否则猛点反而一发都放不出来。
      eng.poopNow = function poopNow() {
        if (eng.mode === 'poop' && !eng.poopFired) return false
        return startPoop(true)
      }

      /* ---- 把模式 + 程序化动作叠加成一组关节目标 ---- */
      function computeTargets() {
        const mode = eng.mode
        let base = POSES.stand
        if (mode === 'sleep') base = POSES.sleep
        else if (mode === 'wake') base = POSES.alert
        else if (mode === 'preen') base = POSES.preen
        else if (mode === 'call') base = POSES.call
        else if (mode === 'peck') base = POSES.peck
        else if (mode === 'poop') base = POSES.poop
        else if (mode === 'slide') base = POSES.slide
        else if (mode === 'drag') base = POSES.dangle
        else if (mode === 'fall') base = POSES.air
        else if (mode === 'hop') base = eng.pendingJump ? POSES.crouch : (eng.hop === null ? POSES.stand : POSES.air)
        else if (mode === 'wander') base = POSES.alert
        if (eng.t < eng.landUntil) base = POSES.land

        for (let i = 0; i < JOINT_KEYS.length; i++) tgt[JOINT_KEYS[i]] = REST[JOINT_KEYS[i]]
        for (const key in base) if (key in tgt) tgt[key] = base[key]

        // 朝向：翻面（flip 也走弹簧，所以转身是连续的，中间会「变薄」一下）
        tgt.flip = eng.facing

        // 位置：走路偏移由锚点驱动，弹簧的滞后刚好当成惯性
        tgt.x += eng.anchor

        /* --- 呼吸：非睡眠、非滑行时胸腔一直在起伏 --- */
        const breathPeriod = mode === 'sleep' ? 5.2 : 3.3
        const breathAmp = mode === 'sleep' ? 0.021 : 0.011
        const br = Math.sin((eng.t / breathPeriod) * Math.PI * 2)
        if (mode !== 'slide' && mode !== 'drag') {
          tgt.sy *= 1 + br * breathAmp
          tgt.sx *= 1 - br * breathAmp * 0.6
          tgt.headTy += br * 0.5
          tgt.tail += br * 1.6
        }

        /* --- 转身：翻面时中间会变薄，同时侧倾、轻轻跳一下 --- */
        const flipAmt = clamp(1 - Math.abs(cur.flip), 0, 1)
        if (flipAmt > 0.01) {
          tgt.rot += flipAmt * 8 * (cur.flip >= 0 ? 1 : -1)
          tgt.y -= flipAmt * 2.4
          tgt.wingSpread += flipAmt * 2.2
          tgt.tail += flipAmt * 5
        }

        /* --- 走路：踏步相位由「已走过的距离」驱动，脚不会打滑 --- */
        if (mode === 'wander' && Math.abs(eng.vx) > 2) {
          const speed = Math.abs(eng.vx)
          const ph = eng.phase
          const lift = clamp(speed / 30, 0, 1.25)
          // 躯干：侧视角下主要是上下起伏 + 轻微前后俯仰
          tgt.rot += Math.sin(ph) * 3.2 * lift
          tgt.y += (Math.cos(ph * 2) * 0.5 - 0.5) * 2.2 * lift
          tgt.x += Math.sin(ph) * 1.1 * lift
          tgt.headRot -= Math.sin(ph) * 2.2 * lift + Math.sin(ph * 2) * 1.5 * lift   // 头稳住了，还带一点点头
          tgt.headTx += Math.sin(ph) * 0.8 * lift
          tgt.bodyRot += Math.sin(ph + 0.35) * 3.2 * lift
          tgt.wingN += Math.sin(ph + 0.7) * 9 * lift
          tgt.wingF -= Math.sin(ph + 0.7) * 8 * lift
          tgt.wingSpread += 1.5 * lift
          tgt.tail += Math.sin(ph + 1.1) * 5 * lift
          // 双脚交替：侧视角下步幅看得最清楚，所以迈得比正面大一点
          const stepL = Math.sin(ph)
          const stepR = Math.sin(ph + Math.PI)
          tgt.footNx += stepR * 6.4 * lift
          tgt.footNy += -Math.max(0, Math.cos(ph + Math.PI)) * 4.2 * lift
          tgt.footNr += -stepR * 9 * lift
          tgt.footFx += stepL * 6.4 * lift
          tgt.footFy += -Math.max(0, Math.cos(ph)) * 3.8 * lift
          tgt.footFr += -stepL * 9 * lift
          // 每一步落地踢起一点雪沫
          if (eng.phase - eng.lastStep > Math.PI) {
            eng.lastStep = eng.phase
            if (lift > 0.5) emit('snow', 52 + Math.sin(ph) * 8, 108, 9)
          }
        } else {
          // 站定时重心慢慢左右移动
          const sway = Math.sin(eng.t * 0.42) * 0.55
          tgt.x += sway
          tgt.rot += sway * 0.5
          tgt.headRot -= sway * 0.35
        }

        /* --- 滑行：加速 -> 压扁 -> 慢慢停下 --- */
        if (mode === 'slide') {
          tgt.rot += Math.sin(eng.t * 5.5) * 0.9
          tgt.headRot += Math.sin(eng.t * 3.1) * 1.6
          tgt.wingN += Math.sin(eng.t * 6.2) * 4
          if (eng.t - eng.lastSpray > 0.13) {
            eng.lastSpray = eng.t
            emit('spray', 20, 104, 12)
          }
        }

        /* --- 叫唤：胸腔鼓起 + 喙一张一合 + 声波圈 --- */
        if (mode === 'call') {
          const p = (Math.sin(eng.t * 4.4) + 1) * 0.5
          tgt.beak = 0.25 + p * 0.75
          tgt.sy *= 1 + p * 0.02
          tgt.headRot += p * 3
          if (eng.t > eng.lastWave + 0.55) {
            eng.lastWave = eng.t
            eng.waveUntil = eng.t + 0.9
          }
        }

        /* --- 啄地：三下急促的低头 --- */
        if (mode === 'peck') {
          const p = (eng.t * 3.9) % 1
          const dip = p < 0.45 ? Math.sin((p / 0.45) * Math.PI) : 0
          tgt.headRot += dip * 13
          tgt.headTy += dip * 3.4
          tgt.y += dip * 1.2
          tgt.tail -= dip * 4
          tgt.beak = dip > 0.55 ? 0.55 : 0
          if (p < 0.08 && eng.t - eng.lastChip > 0.2) {
            eng.lastChip = eng.t
            emit('chip', 62, 104, 8)
          }
        }

        /* --- 拉屎：鼓劲 -> 趴下抬尾 -> 喷射 -> 抖一抖 + 摇屁股 -> 起身 --- */
        if (mode === 'poop') {
          const k = clamp((eng.t - eng.poopStartedAt) / POOP.actionTime, 0, 1)
          const ts = k * POOP.actionTime                     // 已经过去多少秒
          // 鼓劲：再往下坐一点、躯干再压低一点、尾巴再往上顶一截
          const brace = Math.sin(clamp(k / 0.28, 0, 1) * Math.PI * 0.5)
          tgt.y += brace * 0.8
          tgt.bodyRot += brace * 2
          tgt.tail += brace * 4
          // 那一下又短又硬的顶
          const push = Math.sin(clamp((k - 0.24) / 0.22, 0, 1) * Math.PI)
          tgt.tail += push * 12
          tgt.bodyRot += push * 5
          tgt.sy *= 1 - push * 0.03
          tgt.y += push * 1.2
          tgt.headRot += push * 4
          tgt.wingN += brace * 4 + push * 8
          tgt.wingF += brace * 3 + push * 6
          // 使劲的时候眼睛是眯着的：先睁一下、喷出去那下闭紧、之后睁开
          tgt.lid = k < 0.12 ? 0.55 : (k < 0.62 ? 0.16 : 1)
          // 出手那一瞬间的后坐力：身体往前一顿、尾巴甩一下
          const recoil = (k > POOP.fireAt && k < POOP.fireAt + 0.08)
            ? Math.sin(((k - POOP.fireAt) / 0.08) * Math.PI) : 0
          tgt.rot += recoil * 3.2
          tgt.bodyRot -= recoil * 2.2
          tgt.y -= recoil * 1.2
          tgt.tail += recoil * 8
          tgt.headRot -= recoil * 4
          tgt.sy *= 1 + recoil * 0.04
          // 拉完：先抖一抖，再摇几下屁股，幅度一路衰减到停下来
          if (k > POOP.shakeFrom) {
            const st = (k - POOP.shakeFrom) * POOP.actionTime          // 抖动开始后经过的秒数
            const decay = Math.exp(-st * POOP.shakeDecay)
            const wig = Math.sin(st * Math.PI * 2 * POOP.shakeWiggleHz)   // 摇屁股：慢、幅度大
            const shiver = Math.sin(st * Math.PI * 2 * POOP.shakeShiverHz) // 发抖：快、幅度小
            tgt.tail += wig * 17 * decay
            tgt.rot += wig * 2.8 * decay
            tgt.x += wig * 1.7 * decay
            tgt.bodyRot += wig * 3.6 * decay + shiver * 1.2 * decay
            tgt.y += shiver * 0.5 * decay
            tgt.sy *= 1 + shiver * 0.014 * decay
            tgt.wingSpread += shiver * 1.5 * decay
            tgt.headRot -= wig * 1.8 * decay
            tgt.headTx += shiver * 0.4 * decay
          }
          if (!eng.poopFired && k >= POOP.fireAt) {
            eng.poopFired = true
            launchPoop()
          }
        }

        /* --- 理羽：低头去够近侧鳍肢，喙快速开合 --- */
        if (mode === 'preen') {
          const nibble = (Math.sin(eng.t * 17) + 1) * 0.5
          tgt.beak = 0.1 + nibble * 0.4
          tgt.headRot += Math.sin(eng.t * 17) * 2.2
          tgt.headTx += Math.cos(eng.t * 8.5) * 0.8
          const span = eng.modeEnds - eng.t
          tgt.wingN = span < 0.9 ? lerp(-30, -8, 1 - span / 0.9) : POSES.preenWing.wingN
          tgt.wingSpread = 1.4
        }

        /* --- 睡醒：伸个懒腰再站直 --- */
        if (mode === 'wake') {
          const k = clamp(1 - (eng.modeEnds - eng.t) / 1.6, 0, 1)
          const s = Math.sin(k * Math.PI)
          tgt.wingN = -52 * s
          tgt.wingF = -44 * s
          tgt.wingSpread = 3.2 * s
          tgt.sy = 1 + 0.07 * s
          tgt.headRot = -14 * s
          tgt.tail = -9 * s
          tgt.lid = k < 0.25 ? 0.15 : 1
        }

        /* --- 蹦跳：滞空时鳍肢张开、脚收起来 --- */
        if (mode === 'hop' && eng.hop !== null && eng.hop.height > 1.5) {
          tgt.wingN = -46 + Math.sin(eng.t * 26) * 7
          tgt.wingF = -38 + Math.sin(eng.t * 26 + 0.4) * 6
          tgt.footNy = 3.4
          tgt.footFy = 3.4
          tgt.wingSpread = 2.4
        }

        /* --- 被拎起来：脚乱蹬、身体跟着甩 --- */
        if (mode === 'drag') {
          tgt.rot += clamp(eng.dragVx * 0.22, -15, 15)
          tgt.bodyRot += clamp(eng.dragVy * 0.12, -10, 10)
          const kick = Math.sin(eng.t * 12)
          tgt.footNr += kick * 12
          tgt.footFr -= kick * 12
          tgt.wingN += Math.sin(eng.t * 15) * 10
          tgt.wingF += Math.sin(eng.t * 15 + 1.2) * 9
        }

        /* --- 视线：眼睛先动，头再跟上（「活」的关键细节） --- */
        const lookMax = mode === 'sleep' ? 0 : mode === 'wander' ? 3 : 6
        const watching = eng.pointer !== null && eng.pointerAge < 0.35 && lookMax > 0
        if (watching) {
          const px = clamp(eng.pointer.x, -1, 1)
          const py = clamp(eng.pointer.y, -1, 1)
          tgt.pupilX = px * 1.3
          tgt.pupilY = py * 1.05
          const near = eng.pointerDist < 150 ? 1 : 0.45
          tgt.headTx += px * 2.4 * near
          tgt.headRot += py * 3.4 * near
          tgt.headTy += py * 1.1 * near
        } else if (mode !== 'sleep') {
          if (eng.look === null && eng.t > eng.nextLook) {
            const side = rng() < 0.5 ? -1 : 1
            eng.look = { x: side * (1.4 + rng() * 2.6), y: (rng() * 2 - 1) * 1.1, rot: side * (1.5 + rng() * 3.5) }
            eng.lookEnds = eng.t + 0.9 + rng() * 1.6
            tgt.pupilX = clamp(eng.look.x * 0.9, -1.4, 1.4)   // 眼睛先看向那边
            tgt.pupilY = eng.look.y * 0.8
          }
          if (eng.look !== null) {
            if (eng.t > eng.lookEnds) {
              eng.look = null
              eng.nextLook = eng.t + 1.8 + rng() * 3.8
            } else {
              tgt.headTx += eng.look.x
              tgt.headRot += eng.look.rot
              tgt.headTy += eng.look.y
            }
          }
        }

        /* --- 打盹的 Z、叫声的波纹 --- */
        if (mode === 'sleep') {
          eng.zzz = clamp((eng.t - eng.sleepStartedAt - 2.2) / 2.6, 0, 1)
          eng.wave = 0
          tgt.lid = 0
        } else {
          eng.zzz = 0
          const ringing = eng.t < eng.waveUntil
          tgt.wave = ringing ? 1 : 0
          tgt.waveScale = ringing ? 0.72 + 0.55 * ((Math.sin(eng.t * 8.5) + 1) * 0.5) : 1
        }
        tgt.zzz = eng.zzz

        /* --- 眨眼：闭眼占 45% 的时间，睁眼占 55% --- */
        if (mode !== 'sleep') {
          const k = (eng.t - eng.blinkStart) / eng.blinkDur
          if (k >= 0 && k <= 1) tgt.lid = k < 0.45 ? 1 - k / 0.45 : (k - 0.45) / 0.55
        }

        /* --- 影子：跳得越高越小越淡 --- */
        const h = eng.hop === null ? 0 : eng.hop.height
        tgt.shadowSx = 1 - clamp(h / 70, 0, 0.45)
        tgt.shadowSy = 1 - clamp(h / 90, 0, 0.35)
        tgt.shadowOp = 1 - clamp(h / 130, 0, 0.5)
      }

      /* ---- 状态机：挑下一个动作 ---- */
      function pickNextAction() {
        if (reduced) return
        // 还欠着屎就先别乱跑 —— 站着拉完再说。否则刚堆两坨就散步清场，
        // 永远堆不到会炸的量。
        if (eng.poopDebt >= POOP.tokensPerPoop) return
        const r = rng()
        const near = eng.pointer !== null && eng.pointerDist < 130
        if (near) {
          // 有人在看它 —— 叫一声或者整理羽毛更常见
          if (r < 0.34) return setMode('call')
          if (r < 0.56) return setMode('preen')
          return
        }
        if (eng.idleCount >= 3 && r < 0.2) return setMode('sleep')
        if (r < 0.42) return setMode('wander')
        if (r < 0.54) return setMode('preen')
        if (r < 0.66) return setMode('slide')
        if (r < 0.76) return setMode('peck')
        if (r < 0.84) return setMode('call')
        if (r < 0.9) return eng.jump()
      }

      function update(dtRaw) {
        const step = clamp(dtRaw, 0, 1 / 30)
        eng.t += step
        eng.pointerAge += step

        /* --- 跳跃的竖直物理 --- */
        if (eng.pendingJump && eng.t >= eng.jumpAt) {
          eng.pendingJump = false
          eng.hop = { vy: -232, gravity: 900, height: 0 }
          emit('puff', 50, 108, 10)
        }
        if (eng.hop !== null) {
          const hp = eng.hop
          hp.vy += hp.gravity * step
          hp.height -= hp.vy * step
          if (hp.height <= 0) {
            hp.height = 0
            eng.hop = null
            eng.landUntil = eng.t + 0.16
            emit('puff', 52, 108, 17)
            setMode('idle', { duration: 0.8 })
          }
        }

        /* --- 走路：踏步相位由「已走过的距离」驱动，脚不会打滑 ---
           一个完整步态周期（左右各迈一步）前进约 17px，所以相位 = 速度 / 17 * 2π */
        if (eng.mode === 'wander') {
          eng.phase += (Math.abs(eng.vx) / 17) * Math.PI * 2 * step
        }

        /* --- 水平移动 --- */
        let desired = 0
        if (eng.mode === 'wander') {
          const d = eng.wanderTarget - eng.anchor
          const dist = Math.abs(d)
          if (dist < 6) {
            setMode('idle', { duration: 1.6 + rng() * 2 })
          } else {
            desired = clamp(d * 2.4, -30, 30) * (dist < 26 ? dist / 26 : 1)
            if (eng.t > eng.wanderStopAt && rng() < 0.02) {
              eng.wanderStopAt = eng.t + 2.5
              setMode('idle', { duration: 0.9 + rng() * 1.3 })
            }
          }
        } else if (eng.mode === 'slide') {
          if (eng.slideSpeed === 0) eng.slideSpeed = 112
          eng.slideSpeed = Math.max(0, eng.slideSpeed - 34 * step)
          desired = eng.slideSpeed * eng.facing
          if (eng.slideSpeed < 8) {
            emit('snow', 50, 108, 13)
            setMode('idle', { duration: 1.3 })
          }
        } else if (eng.mode === 'fall') {
          desired = eng.dragVx
          eng.dragVx *= 0.94
          if (Math.abs(eng.dragVx) < 9) {
            eng.dragVx = 0
            eng.landUntil = eng.t + 0.18
            emit('puff', 50, 108, 14)
            setMode('idle', { duration: 1.1 })
          }
        }
        const accel = eng.mode === 'wander' ? 95 : 160
        if (eng.vx < desired) eng.vx = Math.min(desired, eng.vx + accel * step)
        else if (eng.vx > desired) eng.vx = Math.max(desired, eng.vx - accel * step)
        eng.anchor += eng.vx * step
        if (eng.anchor < eng.bounds.min) { eng.anchor = eng.bounds.min; eng.vx = 0; if (eng.mode === 'wander') eng.wanderTarget = eng.home }
        if (eng.anchor > eng.bounds.max) { eng.anchor = eng.bounds.max; eng.vx = 0; if (eng.mode === 'wander') eng.wanderTarget = eng.home }
        // 挪窝了：旧的那坨不要了，到新位置重新开张
        checkPileMove()

        /* --- 朝向：平滑翻面（目标在 computeTargets 里下发） --- */
        if ((eng.mode === 'wander' || eng.mode === 'slide') && Math.abs(eng.vx) > 4) {
          eng.facing = eng.vx > 0 ? 1 : -1
        }

        /* --- 眨眼排期 --- */
        if (eng.mode !== 'sleep' && eng.t > eng.blinkStart + eng.blinkDur && eng.t > eng.nextBlink) {
          eng.blinkStart = eng.t
          eng.nextBlink = eng.t + 2.4 + rng() * 4.8
          if (rng() < 0.2) eng.nextBlink = eng.t + eng.blinkDur + 0.16   // 偶尔连眨两下
        }

        /* --- 模式到期 --- */
        if (eng.t > eng.modeEnds) {
          if (eng.mode === 'idle') {
            eng.idleCount++
            pickNextAction()
          } else if (eng.mode === 'sleep') {
            if (rng() < 0.65) setMode('wake', { force: true })
            else setMode('sleep', { duration: 12 + rng() * 20 })
          } else if (eng.mode === 'hop') {
            setMode('idle', { duration: 1.2 })
          } else if (eng.mode === 'drag') {
            // 一直拎着就保持挣扎，等 pointerup
          } else {
            setMode('idle', { duration: 1.4 + rng() * 2.6 })
          }
        }

        /* --- 拉屎的开关：攒够 token 就来一坨 --- */
        if (eng.poopCooldown > 0) eng.poopCooldown -= step
        if (eng.poopEnabled && !reduced) {
          const busy = eng.mode === 'drag' || eng.mode === 'fall' || eng.mode === 'hop'
            || eng.mode === 'poop' || eng.mode === 'sleep'
          if (!busy && eng.poopCooldown <= 0) {
            if (eng.poopDebt >= POOP.tokensPerPoop) {
              startPoop(false)
            } else if (!eng.tokenSeen && eng.t - eng.poopIdleAt > POOP.poopIdleAfter) {
              // 没接到 token 数据时的兜底：偶尔也拉一坨，免得功能看起来是坏的
              eng.poopIdleAt = eng.t
              startPoop(true)
            }
          }
        }

        /* --- 飞行中的那一坨：直接解抛物线（解析解，落点精确到 0，不受帧率影响） --- */
        for (let i = eng.shots.length - 1; i >= 0; i--) {
          const s = eng.shots[i]
          s.age += step
          s.x = s.x0 + s.vx * s.age
          s.y = s.y0 + s.vy * s.age + 0.5 * s.g * s.age * s.age
          // 整条抛物线都要留着（采样够密才平滑），所以上限给得很宽
          if (Math.abs(s.trail[s.trail.length - 2] - s.x) > 0.9
            || Math.abs(s.trail[s.trail.length - 1] - s.y) > 0.9) {
            s.trail.push(s.x, s.y)
            if (s.trail.length > 400) s.trail.splice(0, 2)
          }
          if (s.y >= POOP.ground) {
            // 正好触地的那一刻：0.5·g·t² + vy·t − drop = 0
            const drop = POOP.ground - s.y0
            const tf = (-s.vy + Math.sqrt(s.vy * s.vy + 2 * s.g * drop)) / s.g
            s.x = s.x0 + s.vx * tf
            s.y = POOP.ground
            s.trail.push(s.x, s.y)
            landPoop(s)
            eng.shots.splice(i, 1)
          }
        }

        /* --- 爆炸碎块：从屎堆冲出去，急起慢停，然后糊在屏幕上 --- */
        for (let i = eng.burst.length - 1; i >= 0; i--) {
          const d = eng.burst[i]
          d.age += step
          if (d.age > d.dur + POOP.debrisLife + POOP.debrisFade) {
            eng.burst.splice(i, 1)
            continue
          }
          const p = Math.min(1, d.age / d.dur)
          const e = 1 - (1 - p) * (1 - p) * (1 - p)      // easeOutCubic：一炸就冲出去
          d.x = d.x0 + (d.tx - d.x0) * e
          d.y = d.y0 + (d.ty - d.y0) * e
        }

        computeTargets()

        /* --- 弹簧积分（子步进，保证硬弹簧在低帧率下也稳） --- */
        const sub = step > 1 / 90 ? Math.ceil(step / (1 / 120)) : 1
        const hStep = step / sub
        for (let s = 0; s < sub; s++) {
          for (let i = 0; i < JOINT_KEYS.length; i++) {
            const key = JOINT_KEYS[i]
            const sp = SPRING[key]
            const k = sp.k * (reduced ? 0.6 : 1)
            const a = (tgt[key] - cur[key]) * k - vel[key] * (2 * Math.sqrt(k) * sp.d)
            vel[key] += a * hStep
            cur[key] += vel[key] * hStep
          }
        }

        /* --- 交给渲染的姿态：跳跃高度直接加在 y 上（物理精确，不过弹簧） --- */
        for (let i = 0; i < JOINT_KEYS.length; i++) pose[JOINT_KEYS[i]] = cur[JOINT_KEYS[i]]
        const h = eng.hop === null ? 0 : eng.hop.height
        pose.y = cur.y - h
      }
      eng.update = update

      eng.reset = function reset() {
        for (let i = 0; i < JOINT_KEYS.length; i++) {
          const key = JOINT_KEYS[i]
          cur[key] = REST[key]
          tgt[key] = REST[key]
          vel[key] = 0
        }
        eng.anchor = 0
        eng.vx = 0
        eng.t = 0
        eng.hop = null
        eng.pendingJump = false
        setMode('idle', { force: true })
      }

      setMode('idle', { force: true })
      eng.modeEnds = eng.t + 3
      anchorPile()
      return eng
    }

    /* ==================================================================
     * 3. 样式（角色本身是 SVG，这里只管容器、气泡和插件自带的 UI）
     * ================================================================== */
    const CSS = `
.dsh-pg-pet {
  position: fixed;
  right: 24px;
  bottom: 104px;
  z-index: 9999;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.dsh-pg-pet.dragging { cursor: grabbing; }
.dsh-pg-stage {
  position: relative;
  width: 68px;
  height: 82px;
  display: block;
}
.dsh-pg-art { display: block; width: 100%; height: 100%; overflow: visible; }
.dsh-pg-fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
.dsh-pg-p {
  position: absolute;
  width: 3px;
  height: 3px;
  margin: -1.5px 0 0 -1.5px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 3px rgba(255, 255, 255, 0.9);
  animation: dsh-pg-p-fly 0.72s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
}
.dsh-pg-p.spray { width: 2px; height: 2px; animation-duration: 0.5s; }
.dsh-pg-p.chip { background: #dbeeff; box-shadow: 0 0 3px rgba(190, 225, 255, 0.9); }
@keyframes dsh-pg-p-fly {
  0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
  22% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px)) scale(1.15); }
}
.dsh-pg-word {
  position: absolute;
  bottom: 88px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1, #e2e8f0);
  color: var(--dsw-alias-label-primary, #0f172a);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(2, 8, 23, 0.14);
  animation: dsh-pg-word-float 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes dsh-pg-word-float {
  0% { opacity: 0; transform: translate(-50%, 8px) scale(0.82); }
  14% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  78% { opacity: 1; transform: translate(-50%, -2px) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -20px) scale(0.98); }
}
.dsh-pg-btn-wrap { position: relative; display: inline-flex; align-items: center; }
.dsh-pg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}
.dsh-pg-btn:hover {
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.06));
  transform: translateY(-1px) rotate(-6deg);
}
.dsh-pg-btn:active { transform: scale(0.9); }
.dsh-pg-pops { position: absolute; inset: 0; pointer-events: none; }
.dsh-pg-pop {
  position: absolute;
  bottom: 2px;
  font-size: 12px;
  animation: dsh-pg-pop-float 1.2s ease-out forwards;
}
@keyframes dsh-pg-pop-float {
  0% { opacity: 0; transform: translateY(0) scale(0.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-26px) scale(1.2); }
}
.dsh-pg-dock {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1, #e2e8f0);
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.04));
  color: var(--dsw-alias-label-secondary, #64748b);
  font-size: 11px;
  line-height: 1.5;
  max-width: 100%;
}
.dsh-pg-dock-icon { font-size: 13px; }
.dsh-pg-dock-quote { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-pg-dock-status {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.14);
  color: var(--dsw-alias-brand-primary, #f97316);
  font-weight: 600;
}
.dsh-pg-settings { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.dsh-pg-settings-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--dsw-alias-label-primary, #0f172a); }
.dsh-pg-hint {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #64748b);
  line-height: 1.6;
}
.dsh-pg-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l1, #e2e8f0);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.03));
  font-size: 13px;
  color: var(--dsw-alias-label-primary, #0f172a);
}
.dsh-pg-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  background: var(--dsw-alias-border-l2, #cbd5e1);
  transition: background 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}
.dsh-pg-toggle.on { background: var(--dsw-alias-brand-primary, #f97316); }
.dsh-pg-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.15s ease;
}
.dsh-pg-toggle.on .dsh-pg-toggle-knob { left: 18px; }
.dsh-pg-mini-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px solid var(--dsw-alias-border-l1, #e2e8f0);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.04));
  color: var(--dsw-alias-label-primary, #0f172a);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-pg-mini-btn:hover { border-color: var(--dsw-alias-brand-primary, #f97316); color: var(--dsw-alias-brand-primary, #f97316); }
.dsh-pg-dock-poop {
  flex-shrink: 0;
  padding: 0 7px;
  border: none;
  border-radius: 999px;
  background: rgba(123, 74, 33, 0.16);
  color: #8a5a2a;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.12s ease;
}
.dsh-pg-dock-poop:hover {
  background: rgba(123, 74, 33, 0.3);
  transform: translateY(-1px);
}
.dsh-pg-dock-poop:active { transform: scale(0.94); }

/* ==================================================================
 * 企鹅弹道学：飞行中的那一坨、落地的痕迹、以及两种彩蛋
 * 这一层是挂在桌宠容器里的 fixed 全覆盖层，坐标用屏幕像素，
 * 所以把企鹅拖走以后，地上的痕迹会留在原地。
 * ================================================================== */
/* 屎层：独立挂在 body 上的全覆盖层，和企鹅容器**没有父子关系** ——
 * 拖企鹅不会拖着屎走，屎也不会被企鹅的层叠上下文牵连。
 * z-index 比企鹅低一格，所以屎永远画在企鹅身后。 */
.dsh-pg-poop-layer {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  overflow: hidden;
}
/* 爆炸碎块：糊在屏幕各处的碎块 */
.dsh-pg-debris {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 46% 54% 58% 42% / 52% 46% 54% 48%;
  background: #7b4a21;
  box-shadow: 0 1px 1px rgba(2, 8, 23, 0.25);
  transform-origin: 50% 50%;
  will-change: transform, opacity;
}
.dsh-pg-debris.gold { background: #e3a30b; box-shadow: 0 0 6px rgba(255, 196, 0, 0.85); }
.dsh-pg-debris.rainbow { animation: dsh-pg-hue 2.6s linear infinite; }
/* 爆炸：全屏一闪 + 一圈冲击波 */
.dsh-pg-blast {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 72%, rgba(255, 236, 200, 0.95), rgba(170, 120, 66, 0.5) 45%, rgba(120, 80, 40, 0) 78%);
  animation: dsh-pg-blast-fade 0.6s ease-out forwards;
}
@keyframes dsh-pg-blast-fade {
  0% { opacity: 0; }
  7% { opacity: 1; }
  100% { opacity: 0; }
}
.dsh-pg-shock {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 8px solid rgba(123, 74, 33, 0.85);
  animation: dsh-pg-shock-out 0.85s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
}
@keyframes dsh-pg-shock-out {
  0% { opacity: 0.9; transform: scale(0.25); border-width: 8px; }
  100% { opacity: 0; transform: scale(15); border-width: 1px; }
}
/* 飞出去的那一道：整条抛物线画出来 —— 根部粗、前端细，才有「喷」的锥度。
 * 用三条叠起来的折线做锥度（SVG 描边没法直接变宽），最后加一颗头当液滴。
 * 没有任何表情。 */
.dsh-pg-shot {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  --pg-poop: #7b4a21;
}
.dsh-pg-arc-root,
.dsh-pg-arc-mid,
.dsh-pg-arc-path {
  fill: none;
  stroke: var(--pg-poop);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.dsh-pg-arc-head { fill: var(--pg-poop); }
/* 落地的那一坨：一个软包，底边坐在雪地上 */
.dsh-pg-splat {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 50% 50%;
  --pg-poop: #7b4a21;
  --pg-poop-hi: #9d6733;
}
.dsh-pg-mound-svg {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -100%);
  transform-origin: 50% 100%;
  overflow: visible;
  filter: drop-shadow(0 1px 1px rgba(2, 8, 23, 0.3));
  animation: dsh-pg-plop 0.42s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}
.dsh-pg-mound { fill: var(--pg-poop); }
.dsh-pg-mound-hi { fill: var(--pg-poop-hi); opacity: 0.5; }
/* 快炸了：整坨发抖（贴地缩放，像憋不住） */
.dsh-pg-splat.critical .dsh-pg-mound,
.dsh-pg-splat.critical .dsh-pg-mound-hi {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: dsh-pg-wobble 0.42s ease-in-out infinite;
}
.dsh-pg-splat.critical { filter: brightness(1.12) saturate(1.25); }
@keyframes dsh-pg-wobble {
  0%, 100% { transform: scale(1, 1) translateX(0); }
  25% { transform: scale(1.07, 0.93) translateX(-0.4px); }
  75% { transform: scale(0.95, 1.06) translateX(0.4px); }
}
@keyframes dsh-pg-plop {
  0% { transform: translate(-50%, -100%) scale(1.45, 0.4); }
  55% { transform: translate(-50%, -100%) scale(0.92, 1.12); }
  100% { transform: translate(-50%, -100%) scale(1, 1); }
}
/* —— 1% 黄金屎 —— */
.dsh-pg-shot.gold { --pg-poop: #e3a30b; }
.dsh-pg-splat.gold { --pg-poop: #e3a30b; --pg-poop-hi: #ffd75e; animation: dsh-pg-gold-pulse 1.5s ease-in-out infinite; }
@keyframes dsh-pg-gold-pulse {
  0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(255, 196, 0, 0.7)); }
  50% { filter: brightness(1.32) drop-shadow(0 0 10px rgba(255, 196, 0, 1)); }
}
/* —— 0.1% 彩虹屎 —— */
.dsh-pg-shot.rainbow { animation: dsh-pg-hue 2.6s linear infinite; }
.dsh-pg-splat.rainbow { animation: dsh-pg-rainbow 2.6s linear infinite; }
@keyframes dsh-pg-hue {
  from { filter: hue-rotate(0deg) saturate(2.4); }
  to { filter: hue-rotate(360deg) saturate(2.4); }
}
@keyframes dsh-pg-rainbow {
  from { filter: hue-rotate(0deg) saturate(2.4) drop-shadow(0 0 7px rgba(255, 255, 255, 0.7)); }
  to { filter: hue-rotate(360deg) saturate(2.4) drop-shadow(0 0 7px rgba(255, 255, 255, 0.7)); }
}
.dsh-pg-poop-label {
  position: absolute;
  left: 0;
  top: 0;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: #3b2a00;
  background: linear-gradient(135deg, #fff6cc, #ffcf3d 60%, #ffa800);
  box-shadow: 0 2px 10px rgba(255, 180, 0, 0.55);
  animation: dsh-pg-poop-label-rise 2.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.dsh-pg-poop-label.rainbow {
  color: #2a0a3d;
  background: linear-gradient(135deg, #ffd1ff, #9be7ff 35%, #b6ffcf 65%, #ffe9a8);
  box-shadow: 0 2px 12px rgba(180, 120, 255, 0.6);
}
@keyframes dsh-pg-poop-label-rise {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
  14% { opacity: 1; transform: translate(-50%, -80%) scale(1.08); }
  74% { opacity: 1; transform: translate(-50%, -112%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -155%) scale(0.98); }
}
`

    /* ==================================================================
     * 4. 把姿态写进 DOM
     * ================================================================== */
    function collectParts(root) {
      const map = {}
      if (root === null || root === undefined) return map
      const all = root.querySelectorAll('[id^="pg-"]')
      for (let i = 0; i < all.length; i++) map[all[i].id] = all[i]
      return map
    }

    const lastTransform = new WeakMap()
    const lastOpacity = new WeakMap()
    function applyTransform(el, value) {
      if (lastTransform.get(el) === value) return
      lastTransform.set(el, value)
      el.setAttribute('transform', value)
    }
    function applyOpacity(el, value) {
      const v = Math.round(value * 100) / 100
      if (lastOpacity.get(el) === v) return
      lastOpacity.set(el, v)
      el.setAttribute('opacity', String(v))
    }

    function applyPose(parts, p) {
      const out = poseToParts(p)
      for (const id in out.transforms) {
        const el = parts[id]
        if (el !== undefined) applyTransform(el, out.transforms[id])
      }
      for (const id in out.opacities) {
        const el = parts[id]
        if (el !== undefined) applyOpacity(el, out.opacities[id])
      }
    }

    /* ==================================================================
     * 4b. 把屎画到屏幕上
     *
     *     引擎里的坐标是 viewBox 单位（100 x 120），这里换算成屏幕像素，
     *     节点按 id 复用（Map 里存着），所以每帧只改 transform，不重建 DOM。
     * ================================================================== */
    const shotNodes = new Map()
    const burstNodes = new Map()
    let pileNode = null
    let poopLayerOwner = null
    // 屎独立成一层，直接挂在 document.body 上（不是企鹅容器的子节点）：
    // 两者互不影响 —— 拖企鹅不会拖着屎走，屎也不会被企鹅的层叠上下文压住。
    let poopLayerEl = null
    const SVG_NS = 'http://www.w3.org/2000/svg'
    // 落地那一坨的形状：一个不对称的软包，没有五官
    const MOUND_VIEW = '0 0 30 20'
    const MOUND_PATH = 'M2.2 19.4 C0.2 13.2 3.4 8.2 9 7.3 C11 3.4 18.6 3.3 20.8 7.1 C26.4 7.9 29.8 13.1 27.8 19.4 Z'

    function makeShotNode(layer, s) {
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('class', 'dsh-pg-shot' + (s.kind === 'normal' ? '' : ' ' + s.kind))
      svg.setAttribute('aria-hidden', 'true')
      // 三条同色的折线叠在一起做锥度：根部粗、越往前越细
      const root = document.createElementNS(SVG_NS, 'path')
      root.setAttribute('class', 'dsh-pg-arc-root')
      const mid = document.createElementNS(SVG_NS, 'path')
      mid.setAttribute('class', 'dsh-pg-arc-mid')
      const core = document.createElementNS(SVG_NS, 'path')
      core.setAttribute('class', 'dsh-pg-arc-path')
      const head = document.createElementNS(SVG_NS, 'circle')
      head.setAttribute('class', 'dsh-pg-arc-head')
      head.setAttribute('r', '0')
      svg.appendChild(root)
      svg.appendChild(mid)
      svg.appendChild(core)
      svg.appendChild(head)
      layer.appendChild(svg)
      const node = { root: svg, rootPath: root, midPath: mid, path: core, head: head }
      shotNodes.set(s.id, node)
      return node
    }

    // 整只企鹅只有这一坨：每落一发就重建一次节点，
    // 顺带把「落下来压一下」的动画重新播一遍，尺寸也跟着长。
    function makePileNode(layer, pile) {
      const root = document.createElement('div')
      // 快到爆炸阈值了：整坨开始发抖，给出「快炸了」的预警
      const critical = pile.count >= POOP.explodeAt * POOP.explodeWarn
      root.className = 'dsh-pg-splat' + (pile.kind === 'normal' ? '' : ' ' + pile.kind)
        + (critical ? ' critical' : '')
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('class', 'dsh-pg-mound-svg')
      svg.setAttribute('viewBox', MOUND_VIEW)
      svg.setAttribute('aria-hidden', 'true')
      svg.style.width = pile.w.toFixed(1) + 'px'
      svg.style.height = (pile.w * 2 / 3).toFixed(1) + 'px'
      const mound = document.createElementNS(SVG_NS, 'path')
      mound.setAttribute('class', 'dsh-pg-mound')
      mound.setAttribute('d', MOUND_PATH)
      svg.appendChild(mound)
      const hi = document.createElementNS(SVG_NS, 'ellipse')
      hi.setAttribute('class', 'dsh-pg-mound-hi')
      hi.setAttribute('cx', '10.5')
      hi.setAttribute('cy', '9.6')
      hi.setAttribute('rx', '3.6')
      hi.setAttribute('ry', '1.9')
      hi.setAttribute('transform', 'rotate(-16 10.5 9.6)')
      svg.appendChild(hi)
      root.appendChild(svg)
      layer.appendChild(root)
      return { root: root, count: pile.count }
    }

    function syncPoopLayer(layer, eng, host) {
      if (layer === null || host === null) return
      // 图层换过（宠物关掉再打开、插件热重载）——缓存里的节点已经不在文档里了，
      // 直接丢掉重建，否则屎会一直画在不存在的节点上（也就是看不见）。
      if (poopLayerOwner !== layer) {
        shotNodes.forEach(function (node) { node.root.remove() })
        burstNodes.forEach(function (node) { node.root.remove() })
        if (pileNode !== null) pileNode.root.remove()
        shotNodes.clear()
        burstNodes.clear()
        pileNode = null
        poopLayerOwner = layer
      }
      const rect = host.getBoundingClientRect()
      if (rect.width === 0) return
      const kx = rect.width / VIEW_W
      const ky = rect.height / VIEW_H
      // 把整块屏幕换算成 pet 局部单位喂给引擎 —— 爆炸碎块要炸满它
      eng.setViewport(-rect.left / kx, -rect.top / ky,
        (window.innerWidth - rect.left) / kx, (window.innerHeight - rect.top) / ky)

      const liveShots = new Set()
      for (let i = 0; i < eng.shots.length; i++) {
        const s = eng.shots[i]
        liveShots.add(s.id)
        let node = shotNodes.get(s.id)
        if (node === undefined) node = makeShotNode(layer, s)
        const w = clamp(s.size * 1.1 * (s.growth === undefined ? 1 : s.growth), 3, 11)
        // 整条轨迹直接连成折线（采样够密，看上去就是平滑的抛物线），
        // 再按长度切成三段分别描边 —— 根部粗、前端细，锥度就出来了
        const pts = []
        for (let k = 0; k < s.trail.length; k += 2) {
          pts.push((rect.left + s.trail[k] * kx).toFixed(1) + ' ' + (rect.top + s.trail[k + 1] * ky).toFixed(1))
        }
        const hx = rect.left + s.x * kx
        const hy = rect.top + s.y * ky
        pts.push(hx.toFixed(1) + ' ' + hy.toFixed(1))
        const slice = function (ratio) {
          const n = Math.max(2, Math.ceil(pts.length * ratio))
          return 'M' + pts.slice(0, n).join('L')
        }
        node.rootPath.setAttribute('stroke-width', (w * 1.35).toFixed(2))
        node.rootPath.setAttribute('d', slice(0.34))
        node.midPath.setAttribute('stroke-width', (w * 0.85).toFixed(2))
        node.midPath.setAttribute('d', slice(0.68))
        node.path.setAttribute('stroke-width', (w * 0.45).toFixed(2))
        node.path.setAttribute('d', 'M' + pts.join('L'))
        node.head.setAttribute('cx', hx.toFixed(1))
        node.head.setAttribute('cy', hy.toFixed(1))
        node.head.setAttribute('r', (w * 0.62).toFixed(2))
      }
      shotNodes.forEach(function (node, id) {
        if (liveShots.has(id)) return
        node.root.remove()
        shotNodes.delete(id)
      })

      // 整只企鹅只有这一坨：位置固定，每落一发就重建节点 ——
      // 尺寸跟着长，落地那下「压一压」的动画也重新播一遍。
      const pile = eng.pile
      if (pile === null) {
        if (pileNode !== null) {
          pileNode.root.remove()
          pileNode = null
        }
      } else {
        if (pileNode === null || pileNode.count !== pile.count) {
          if (pileNode !== null) pileNode.root.remove()
          pileNode = makePileNode(layer, pile)
        }
        // 落点固定在堆的**前缘**（离企鹅恒定距离），堆长胖是往身后长 ——
        // 所以画的时候要把中心往后挪半个宽度，否则堆一大就贴到企鹅身上了。
        const screenX = rect.left + pile.x * kx - pile.face * (pile.w / 2)
        pileNode.root.style.transform = 'translate(' + screenX.toFixed(2) + 'px,'
          + (rect.top + pile.y * ky).toFixed(2) + 'px) rotate(' + pile.rot.toFixed(1) + 'deg)'
      }

      // 爆炸碎块：糊在屏幕各处的碎块，到寿命之后淡出
      const liveBurst = new Set()
      for (let i = 0; i < eng.burst.length; i++) {
        const d = eng.burst[i]
        liveBurst.add(d)
        let node = burstNodes.get(d)
        if (node === undefined) {
          const el = document.createElement('span')
          el.className = 'dsh-pg-debris' + (d.kind === 'normal' ? '' : ' ' + d.kind)
          layer.appendChild(el)
          node = { root: el }
          burstNodes.set(d, node)
        }
        const over = d.age - d.dur - POOP.debrisLife
        const fade = over > 0 ? Math.max(0, 1 - over / POOP.debrisFade) : 1
        node.root.style.width = (d.r * 2).toFixed(2) + 'px'
        node.root.style.height = (d.r * 1.6).toFixed(2) + 'px'
        node.root.style.opacity = fade.toFixed(2)
        node.root.style.transform = 'translate(' + (rect.left + d.x * kx).toFixed(2) + 'px,'
          + (rect.top + d.y * ky).toFixed(2) + 'px) rotate(' + d.rot.toFixed(0) + 'deg) scale('
          + (0.6 + fade * 0.4).toFixed(2) + ')'
      }
      burstNodes.forEach(function (node, key) {
        if (liveBurst.has(key)) return
        node.root.remove()
        burstNodes.delete(key)
      })
    }

    /** 爆炸那一下的全屏白闪 + 冲击波圈。 */
    function showExplosionFlash(layer, host) {
      if (layer === null || host === null) return
      const rect = host.getBoundingClientRect()
      const flash = document.createElement('div')
      flash.className = 'dsh-pg-blast'
      layer.appendChild(flash)
      window.setTimeout(function () { flash.remove() }, 700)
      const ring = document.createElement('div')
      ring.className = 'dsh-pg-shock'
      ring.style.left = (rect.left + rect.width * 0.5 - 40).toFixed(1) + 'px'
      ring.style.top = (rect.top + rect.height * 0.72 - 40).toFixed(1) + 'px'
      layer.appendChild(ring)
      window.setTimeout(function () { ring.remove() }, 900)
    }

    function showPoopLabel(layer, host, text, kind) {
      if (layer === null || host === null) return
      const rect = host.getBoundingClientRect()
      const el = document.createElement('div')
      el.className = 'dsh-pg-poop-label' + (kind === 'rainbow' ? ' rainbow' : '')
      el.textContent = text
      el.style.left = (rect.left + rect.width * 0.5).toFixed(2) + 'px'
      el.style.top = (rect.top - 2).toFixed(2) + 'px'
      layer.appendChild(el)
      window.setTimeout(function () { el.remove() }, 2500)
    }

    /* ==================================================================
     * 5. React 组件
     * ================================================================== */
    function apply(ctx) {
      const slots = ctx.get('slots')
      const theme = ctx.get('theme')

      const store = {
        themeOn: true,
        petOn: true,
        poopOn: true,
        petState: 'idle',
        jumpSignal: 0,
        poopSignal: 0,
        tokens: 0,
        poopCount: 0,
        goldCount: 0,
        rainbowCount: 0,
        listeners: new Set(),
        get() {
          return {
            themeOn: this.themeOn,
            petOn: this.petOn,
            poopOn: this.poopOn,
            petState: this.petState,
            jumpSignal: this.jumpSignal,
            poopSignal: this.poopSignal,
            tokens: this.tokens,
            poopCount: this.poopCount,
            goldCount: this.goldCount,
            rainbowCount: this.rainbowCount,
          }
        },
        set(patch) {
          Object.assign(this, patch)
          const snap = this.get()
          this.listeners.forEach((fn) => fn(snap))
        },
        subscribe(fn) {
          this.listeners.add(fn)
          return () => this.listeners.delete(fn)
        },
      }

      let themeLayerDispose = null
      const syncTheme = () => {
        if (theme === undefined) return
        if (store.themeOn && themeLayerDispose === null) {
          themeLayerDispose = theme.overrideTokens('penguin-playground', PENGUIN_TOKENS)
        } else if (!store.themeOn && themeLayerDispose !== null) {
          themeLayerDispose()
          themeLayerDispose = null
        }
      }
      const toggleTheme = () => {
        store.set({ themeOn: !store.themeOn })
        syncTheme()
      }
      syncTheme()
      ctx.effect(() => () => { if (themeLayerDispose !== null) themeLayerDispose() })

      const styleEl = document.createElement('style')
      styleEl.setAttribute('data-dsh-penguin-playground', '')
      styleEl.textContent = CSS
      document.head.appendChild(styleEl)
      ctx.effect(() => () => styleEl.remove())

      const usePenguinStore = () => {
        const [snap, setSnap] = React.useState(() => store.get())
        React.useEffect(() => store.subscribe(setSnap), [])
        return snap
      }

      const REDUCED = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      function PetPenguin() {
        const snap = usePenguinStore()
        const containerRef = React.useRef(null)
        const artRef = React.useRef(null)
        const fxRef = React.useRef(null)
        const rareRef = React.useRef(0)
        const blastRef = React.useRef(0)
        const engineRef = React.useRef(null)
        const partsRef = React.useRef(null)
        const [words, setWords] = React.useState(null)
        const [pos, setPos] = React.useState(null)
        const [dragging, setDragging] = React.useState(false)
        const dragRef = React.useRef({ startX: 0, startY: 0, left: 0, top: 0, moved: false, vx: 0, vy: 0 })
        const wordTimer = React.useRef(0)

        if (engineRef.current === null) engineRef.current = createEngine({ reducedMotion: REDUCED })

        const speak = (list) => {
          const id = Date.now() + Math.random()
          setWords({ id, text: list[Math.floor(Math.random() * list.length)] })
          window.clearTimeout(wordTimer.current)
          wordTimer.current = window.setTimeout(() => setWords((w) => (w !== null && w.id === id ? null : w)), 1500)
        }

        // 让企鹅知道屏幕边界：别走出可视区
        const syncBounds = React.useCallback(() => {
          const eng = engineRef.current
          const host = containerRef.current
          if (eng === null || host === null) return
          const rect = host.getBoundingClientRect()
          const margin = 6
          const min = Math.max(-110, margin - rect.left)
          const max = Math.min(110, window.innerWidth - margin - rect.width - rect.left)
          eng.setBounds(min, Math.max(min, max))
        }, [])

        // 状态同步给 dock（token / 坨数也走这里，避免每来一段 token 就重渲染）
        React.useEffect(() => {
          const id = window.setInterval(() => {
            const eng = engineRef.current
            if (eng === null) return
            const patch = {}
            if (store.petState !== eng.status) patch.petState = eng.status
            if (store.tokens !== eng.tokenTotal) patch.tokens = eng.tokenTotal
            if (store.poopCount !== eng.poopCount) patch.poopCount = eng.poopCount
            if (store.goldCount !== eng.goldCount) patch.goldCount = eng.goldCount
            if (store.rainbowCount !== eng.rainbowCount) patch.rainbowCount = eng.rainbowCount
            if (patch.petState !== undefined || patch.tokens !== undefined || patch.poopCount !== undefined
              || patch.goldCount !== undefined || patch.rainbowCount !== undefined) store.set(patch)
          }, 400)
          return () => window.clearInterval(id)
        }, [])

        React.useEffect(() => {
          syncBounds()
          window.addEventListener('resize', syncBounds)
          return () => window.removeEventListener('resize', syncBounds)
        }, [snap.petOn, syncBounds])

        // 主循环：引擎推进 + 写 transform + 撒粒子
        React.useEffect(() => {
          const eng = engineRef.current
          let raf = 0
          let last = performance.now()
          const tick = (now) => {
            raf = window.requestAnimationFrame(tick)
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            if (document.hidden) return
            let parts = partsRef.current
            // 宠物被关掉再打开时 SVG 是新的节点，这里兜底重新收集
            if (parts === null || parts['pg-root'] === undefined || parts['pg-root'].isConnected !== true) {
              parts = collectParts(artRef.current)
              partsRef.current = parts
            }
            // token 计量 -> 拉屎：投喂数据、跟随开关、推进弹道
            eng.poopEnabled = store.poopOn
            // 只有真的接到投影才投喂：否则 setTokens(0) 会把 tokenSeen 打开，
            // 兜底节奏就永远不会生效了
            if (tokenBus.seen) eng.setTokens(tokenBus.total)
            if (!store.poopOn && (eng.shots.length > 0 || eng.pile !== null)) eng.clearPoop()
            eng.update(dt, now)
            applyPose(parts, eng.pose)
            const poopLayer = poopLayerEl
            if (poopLayer !== null) poopLayer.style.display = store.petOn ? '' : 'none'
            if (eng.shots.length > 0 || eng.pile !== null || eng.burst.length > 0
              || shotNodes.size > 0 || burstNodes.size > 0 || pileNode !== null) {
              syncPoopLayer(poopLayer, eng, containerRef.current)
            }
            // 彩蛋掉落：喊一句话 + 飘个标签
            if (eng.rareSignal !== rareRef.current) {
              rareRef.current = eng.rareSignal
              const rareKind = eng.rareKind
              speak(POOP_TEXT[rareKind] || POOP_TEXT.normal)
              showPoopLabel(poopLayer, containerRef.current,
                rareKind === 'rainbow' ? '🌈 彩虹屎！' : '🪙 黄金屎！', rareKind)
            }
            // 炸了：全屏闪一下 + 喊一句
            if (eng.explodeSignal !== blastRef.current) {
              blastRef.current = eng.explodeSignal
              speak(POOP_TEXT.blast)
              showExplosionFlash(poopLayer, containerRef.current)
            }
            const fx = eng.takeFx()
            const layer = fxRef.current
            if (fx !== null && layer !== null) {
              for (let i = 0; i < fx.length; i++) {
                const p = fx[i]
                const el = document.createElement('span')
                el.className = 'dsh-pg-p' + (p.kind === 'spray' ? ' spray' : p.kind === 'chip' ? ' chip' : '')
                el.style.left = (p.x / VIEW_W) * 100 + '%'
                el.style.top = (p.y / VIEW_H) * 100 + '%'
                el.style.setProperty('--dx', String(p.dx))
                el.style.setProperty('--dy', String(p.dy))
                el.style.animationDelay = (i * 0.02) + 's'
                layer.appendChild(el)
                window.setTimeout(() => el.remove(), 900)
              }
            }
          }
          raf = window.requestAnimationFrame(tick)
          return () => window.cancelAnimationFrame(raf)
        }, [])

        // 彩蛋按钮 / 外部信号：跳一下
        React.useEffect(() => {
          if (snap.jumpSignal === 0) return
          const eng = engineRef.current
          eng.wake()
          eng.jump()
          speak(ACTION_WORDS.hop)
        }, [snap.jumpSignal])

        // 设置页的「立刻来一坨」：不欠债也表演一次，方便确认动画是好的
        React.useEffect(() => {
          if (snap.poopSignal === 0) return
          const eng = engineRef.current
          eng.wake()
          eng.poopNow()
        }, [snap.poopSignal])

        // 鼠标靠近时看着它（眼睛先动，头再跟上）
        React.useEffect(() => {
          if (REDUCED) return
          const eng = engineRef.current
          let raf = 0
          let mx = -1e4
          let my = -1e4
          let hoverSince = 0
          const onMove = (e) => { mx = e.clientX; my = e.clientY }
          const onLeave = () => { mx = -1e4; my = -1e4 }
          window.addEventListener('pointermove', onMove, { passive: true })
          window.addEventListener('pointerleave', onLeave)
          const loop = () => {
            raf = window.requestAnimationFrame(loop)
            const host = containerRef.current
            if (host === null) return
            const rect = host.getBoundingClientRect()
            if (rect.width === 0) return
            const cx = rect.left + rect.width * 0.55 + eng.pose.x
            const cy = rect.top + rect.height * 0.26
            const dx = mx - cx
            const dy = my - cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > 460) {
              eng.clearPointer()
              hoverSince = 0
              return
            }
            eng.setPointer(clamp(dx / 120, -1, 1), clamp(dy / 120, -1, 1), dist)
            // 凑得特别近而且盯了一会儿，就把睡着的它叫醒
            if (dist < 70) {
              if (hoverSince === 0) hoverSince = performance.now()
              else if (performance.now() - hoverSince > 1200) eng.wake()
            } else hoverSince = 0
          }
          raf = window.requestAnimationFrame(loop)
          return () => {
            window.cancelAnimationFrame(raf)
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerleave', onLeave)
          }
        }, [])

        // 拖动：抓起来会挣扎，松手会摔一下再站稳
        React.useEffect(() => {
          if (!dragging) return
          const eng = engineRef.current
          const move = (e) => {
            const d = dragRef.current
            const dx = e.clientX - d.startX
            const dy = e.clientY - d.startY
            if (!d.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) d.moved = true
            d.left += dx
            d.top += dy
            d.vx = d.vx * 0.55 + dx * 1.9
            d.vy = d.vy * 0.55 + dy * 1.9
            d.startX = e.clientX
            d.startY = e.clientY
            eng.dragVx = clamp(d.vx, -90, 90)
            eng.dragVy = clamp(d.vy, -70, 70)
            setPos({ left: d.left, top: d.top })
          }
          const up = () => {
            const d = dragRef.current
            const left = Math.min(Math.max(8, d.left), Math.max(8, window.innerWidth - 84))
            const top = Math.min(Math.max(8, d.top), Math.max(8, window.innerHeight - 104))
            setPos({ left, top })
            setDragging(false)
            eng.endDrag(d.vx * 1.4, d.vy)
            window.setTimeout(syncBounds, 0)
          }
          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', up)
          window.addEventListener('pointercancel', up)
          return () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
            window.removeEventListener('pointercancel', up)
          }
        }, [dragging, syncBounds])

        React.useEffect(() => () => window.clearTimeout(wordTimer.current), [])

        if (!snap.petOn) return null

        const style = pos !== null
          ? { left: pos.left + 'px', top: pos.top + 'px', right: 'auto', bottom: 'auto' }
          : undefined

        const doAction = () => {
          const eng = engineRef.current
          eng.wake()
          const act = CLICK_ACTIONS[Math.floor(Math.random() * CLICK_ACTIONS.length)]
          if (act === 'hop') eng.jump()
          else eng.poke(act)
          speak(ACTION_WORDS[act] || ACTION_WORDS.hop)
        }

        return React.createElement('div', {
          ref: containerRef,
          className: 'dsh-pg-pet' + (dragging ? ' dragging' : ''),
          style,
          title: '按住拖动我 · 点我表演随机动作 · 烧掉的 token 会变成屎',
          onPointerDown: (e) => {
            if (e.button !== 0) return
            const rect = e.currentTarget.getBoundingClientRect()
            dragRef.current = {
              startX: e.clientX, startY: e.clientY,
              left: rect.left, top: rect.top,
              moved: false, vx: 0, vy: 0,
            }
            setDragging(true)
            engineRef.current.startDrag()
            // 拎起来换个地方 = 挪窝：旧的屎连同炸出来的碎块一起清掉
            engineRef.current.clearPoop()
          },
          onClick: () => {
            if (dragRef.current.moved) { dragRef.current.moved = false; return }
            doAction()
          },
        },
          React.createElement('div', { className: 'dsh-pg-stage' },
            React.createElement('svg', {
              ref: artRef,
              className: 'dsh-pg-art',
              viewBox: '0 0 ' + VIEW_W + ' ' + VIEW_H,
              dangerouslySetInnerHTML: { __html: PENGUIN_INNER },
            }),
            React.createElement('div', { ref: fxRef, className: 'dsh-pg-fx' }),
          ),
          words !== null
            ? React.createElement('div', { key: words.id, className: 'dsh-pg-word' }, words.text)
            : null,
        )
      }

      function PenguinButton() {
        const [burst, setBurst] = React.useState(0)
        const fire = () => {
          setBurst(Date.now())
          store.set({ jumpSignal: Date.now() })
          window.setTimeout(() => setBurst(0), 1400)
        }
        const pops = burst === 0 ? null : [0, 1, 2].map((i) => React.createElement('span', {
          key: i,
          className: 'dsh-pg-pop',
          style: { left: 4 + i * 10 + 'px', animationDelay: i * 0.12 + 's' },
        }, '🫧'))
        return React.createElement('div', { className: 'dsh-pg-btn-wrap', title: '企鹅彩蛋：点我召唤企鹅' },
          React.createElement('button', { type: 'button', className: 'dsh-pg-btn', 'aria-label': '企鹅彩蛋', onClick: fire }, '🐧'),
          burst !== 0 ? React.createElement('div', { key: burst, className: 'dsh-pg-pops' }, pops) : null,
        )
      }

      function PenguinDock() {
        const snap = usePenguinStore()
        const [qi, setQi] = React.useState(0)
        React.useEffect(() => {
          const id = window.setInterval(() => setQi((i) => (i + 1) % QUOTES.length), 15000)
          return () => window.clearInterval(id)
        }, [])
        const statusText = STATUS_TEXT[snap.petState] || '发呆中'
        // 这一颗既是计数器也是按钮：点一下就立刻拉一坨（不用等 token，也不用开设置）
        const poopChip = React.createElement('button', {
          type: 'button',
          className: 'dsh-pg-dock-poop',
          title: '点我立刻来一坨 · 本次会话 ' + snap.tokens.toLocaleString() + ' tokens'
            + ' · 已拉 ' + snap.poopCount + ' 坨'
            + (snap.goldCount > 0 ? ' · 黄金 ' + snap.goldCount : '')
            + (snap.rainbowCount > 0 ? ' · 彩虹 ' + snap.rainbowCount : ''),
          onClick: () => store.set({ poopSignal: store.poopSignal + 1 }),
        }, '💩 ' + snap.poopCount
          + (snap.goldCount > 0 ? ' 🪙' + snap.goldCount : '')
          + (snap.rainbowCount > 0 ? ' 🌈' + snap.rainbowCount : ''))
        return React.createElement('div', { className: 'dsh-pg-dock', title: '企鹅状态栏' },
          React.createElement('span', { className: 'dsh-pg-dock-icon' }, '🐧'),
          React.createElement('span', { className: 'dsh-pg-dock-quote' }, QUOTES[qi]),
          poopChip,
          React.createElement('span', { className: 'dsh-pg-dock-status' }, statusText),
        )
      }

      function ToggleRow(props) {
        return React.createElement('div', { className: 'dsh-pg-toggle-row' },
          React.createElement('span', null, props.label),
          React.createElement('button', {
            type: 'button',
            className: 'dsh-pg-toggle' + (props.on ? ' on' : ''),
            'aria-label': props.label,
            onClick: props.onToggle,
          }, React.createElement('span', { className: 'dsh-pg-toggle-knob' })),
        )
      }

      function PenguinSettings() {
        const snap = usePenguinStore()
        return React.createElement('div', { className: 'dsh-pg-settings' },
          React.createElement('div', { className: 'dsh-pg-settings-title' }, '🐧 企鹅乐园'),
          React.createElement('p', { className: 'dsh-pg-hint' }, '右下角是一只巴布亚企鹅（Gentoo）：白色的眼罩、橘红的喙、粉橘色的蹼足，还有一条向后拖着的长尾巴。它会散步、打盹、肚皮滑行、叫唤、啄地、梳毛；鼠标靠近时它会看着你，按住可以拖到屏幕任何位置，松手会摔一下再站稳。'),
          React.createElement(ToggleRow, { label: '企鹅主题配色（橘喙 + 冰原底色）', on: snap.themeOn, onToggle: toggleTheme }),
          React.createElement(ToggleRow, { label: '右下角企鹅宠物', on: snap.petOn, onToggle: () => store.set({ petOn: !snap.petOn }) }),
          React.createElement(ToggleRow, {
            label: '企鹅拉屎（跟着 token 消耗走 · 1% 黄金屎 / 0.1% 彩虹屎）',
            on: snap.poopOn,
            onToggle: () => store.set({ poopOn: !snap.poopOn }),
          }),
          React.createElement('div', { className: 'dsh-pg-toggle-row' },
            React.createElement('span', null,
              '本次会话：' + snap.tokens.toLocaleString() + ' tokens · 已拉 ' + snap.poopCount + ' 坨'
              + (snap.goldCount > 0 ? ' · 黄金 ' + snap.goldCount : '')
              + (snap.rainbowCount > 0 ? ' · 彩虹 ' + snap.rainbowCount : '')),
            React.createElement('button', {
              type: 'button',
              className: 'dsh-pg-mini-btn',
              title: '不等 token，直接表演一次（用来确认动画）',
              onClick: () => store.set({ poopSignal: store.poopSignal + 1 }),
            }, '立刻来一坨'),
          ),
        )
      }

      /* ---------------- token 计量桥 ----------------
       * 会话级 token 用量挂在客户端投影 `tokenUsage` 上 —— 就是输入框底下那条
       * 统计胶囊用的同一个数据源 —— 而 `useProjection` 是「session 作用域 slot」
       * 才会注入的标准 prop。桌宠本体挂在 body 上的独立 portal 里，够不到它，
       * 所以这里注册一个什么都不渲染的桥，把数值搬到 tokenBus 上。
       * 投影值的形状：{ uncachedInputTokens, cacheReadTokens, cacheWriteTokens, outputTokens }。
       */
      function TokenMeterReader(props) {
        const usage = props.useProjection('tokenUsage')
        React.useEffect(() => {
          if (usage === null || usage === undefined) return
          const total = (usage.uncachedInputTokens || 0) + (usage.cacheReadTokens || 0)
            + (usage.cacheWriteTokens || 0) + (usage.outputTokens || 0)
          if (!isFinite(total)) return
          tokenBus.total = total
          tokenBus.seen = true
        }, [usage])
        return null
      }
      function TokenBridge(props) {
        // 投影 Hook 只在 session 作用域里存在：拿不到就整块不渲染。
        // 这样 TokenMeterReader 的 Hook 调用顺序永远稳定，不会条件调用 Hook。
        if (typeof props.useProjection !== 'function') return null
        return React.createElement(TokenMeterReader, { useProjection: props.useProjection })
      }

      // 屎层是独立的一层：自己挂在 document.body 上，不是企鹅容器的子节点。
      // 这样拖走企鹅时屎留在原地（企鹅容器移动不影响它），层叠也互不干扰。
      ctx.effect(() => {
        const host = document.createElement('div')
        host.setAttribute('data-dsh-penguin-poop', '')
        host.className = 'dsh-pg-poop-layer'
        document.body.appendChild(host)
        poopLayerEl = host
        return () => {
          poopLayerEl = null
          shotNodes.forEach(function (node) { node.root.remove() })
          burstNodes.forEach(function (node) { node.root.remove() })
          if (pileNode !== null) pileNode.root.remove()
          shotNodes.clear()
          burstNodes.clear()
          pileNode = null
          poopLayerOwner = null
          host.remove()
        }
      })

      // The pet lives in its own portal mounted straight on document.body.
      // The shell.overlay layer sits inside an `absolute; z-index: 20` frame,
      // so anything there would be buried under the better-sidebar panel
      // (`fixed; z-index: 50`). A body portal with a higher z-index keeps the
      // penguin on top, like a desktop pet.
      ctx.effect(() => {
        const host = document.createElement('div')
        host.setAttribute('data-dsh-penguin-pet', '')
        document.body.appendChild(host)
        const root = ReactDOMClient.createRoot(host)
        root.render(React.createElement(PetPenguin))
        return () => {
          root.unmount()
          host.remove()
        }
      })

      if (slots !== undefined) {
        slots.inject('conversation.input.right', () => slots.register(
          { name: 'conversation.input.right', id: 'penguin-button', order: 10, label: '企鹅彩蛋' },
          () => React.createElement(PenguinButton),
        ))
        slots.inject('conversation.composer.dock', () => slots.register(
          { name: 'conversation.composer.dock', id: 'penguin-quote', order: 10, label: '企鹅状态栏' },
          () => React.createElement(PenguinDock),
        ))
        // 不渲染任何东西：只负责把 tokenUsage 投影喂给桌宠
        slots.inject('conversation.composer.dock', () => slots.register(
          { name: 'conversation.composer.dock', id: 'penguin-token-meter', order: 11, label: '企鹅 token 计量' },
          TokenBridge,
        ))
        slots.inject('settings.section', () => slots.register(
          { name: 'settings.section', id: 'penguin-playground', order: 10, label: '企鹅乐园' },
          () => React.createElement(PenguinSettings),
        ))
      }
    }

    exports.apply = apply
    exports.inject = ['slots']
    // 测试缝：给离线预览/自动化用的纯函数，不参与 DSH 的加载流程。
    exports.__internals = {
      PENGUIN_SVG, PENGUIN_INNER, VIEW_W, VIEW_H, REST, POSES, SPRING,
      createEngine, poseToParts, makeRng, applyPose, collectParts,
      POOP, POOP_TEXT, tokenBus, syncPoopLayer,
    }
    return module.exports
  },
})
