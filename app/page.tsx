"use client";

import { useEffect, useMemo, useState } from "react";

type View = "start" | "product" | "budget" | "record";
type Category = "抽纸" | "成人尿片";
type DailyRow = { date: string; visitors: string; orders: string; revenue: string; spend: string };

const money = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 1 }).format(value);
const n = (value: string) => Math.max(0, Number(value) || 0);
const pct = (top: number, bottom: number) => bottom ? top / bottom * 100 : 0;
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());

const plans = [
  ["DAY 1", "确定一个主推商品", "不要同时推广全店。先选抽纸或成人尿片中的一个具体规格，作为7天主推款。", "选定主推款"],
  ["DAY 2", "补齐真实商品信息", "记录材质、规格、数量、适用人群、发货时间和售后。没有检测证明的卖点不要写。", "完成事实清单"],
  ["DAY 3", "完成标题和5张商品图", "标题覆盖品类、规格、场景；主图只讲一个购买理由，其他图片依次讲规格、细节、场景和承诺。", "发布商品页"],
  ["DAY 4", "观察3个真实竞品", "只选同关键词、同规格和相近价格的竞品，记录它们的主图、价格、销量与差评问题。", "填写竞品表"],
  ["DAY 5", "发布一条使用场景内容", "抽纸演示尺寸、韧性和使用场景；成人尿片讲尺码选择、日夜使用和照护流程。避免虚假功效。", "发布1条内容"],
  ["DAY 6", "算清保本线后再投放", "填写售价、成本、运费和扣点。没有正毛利不投广告；有毛利也只做小预算测试。", "得到止损线"],
  ["DAY 7", "记录第一周真实数据", "记录访客、订单、营业额、广告花费和退款原因。下一周只改一个变量。", "完成首次复盘"],
] as const;

const categoryGuide: Record<Category, { keywords: string[]; facts: string[]; images: string[]; warnings: string[] }> = {
  "抽纸": {
    keywords: ["抽纸", "家用抽纸", "整箱抽纸", "原生木浆抽纸", "大包抽纸", "餐巾纸", "婴儿可用（需有依据）"],
    facts: ["每包抽数与层数", "单张尺寸", "包数与总抽数", "纸张原料", "是否有检测报告", "包装尺寸与整箱重量"],
    images: ["主图：整箱数量和单包尺寸", "规格图：几包×几抽×几层", "细节图：纸张纹理与尺寸尺", "场景图：餐桌、卧室或办公使用", "承诺图：真实发货规格与售后"],
    warnings: ["不要把张数和抽数混写", "图片、标题和SKU规格必须一致", "没有检测依据不要写抗菌、无荧光剂等绝对承诺"],
  },
  "成人尿片": {
    keywords: ["成人尿片", "成人纸尿裤", "老人纸尿裤", "护理尿片", "夜用成人尿裤", "大吸量（需有依据）", "L/XL码"],
    facts: ["腰围和尺码范围", "每包片数", "日用或夜用", "适用人群与穿戴方式", "吸收量或检测依据", "生产日期与保质期"],
    images: ["主图：尺码、片数和日/夜用途", "尺码图：腰围测量与选码方法", "结构图：表层、吸收层和防漏设计", "场景图：照护者更换步骤", "承诺图：生产信息、发货和售后"],
    warnings: ["它是护理用品，不要宣传治疗疾病", "吸收量、抑菌、透气等描述需要真实依据", "必须清楚标注尺码，降低选错码退款"],
  },
};

export default function Home() {
  const [view, setView] = useState<View>("start");
  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState<Category>("抽纸");
  const [done, setDone] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [facts, setFacts] = useState({ brand: "", material: "", spec: "", count: "", scene: "", proof: "" });
  const [finance, setFinance] = useState({ price: "", cost: "", shipping: "", feeRate: "", refundRate: "", budget: "" });
  const [draft, setDraft] = useState<DailyRow>({ date: today(), visitors: "", orders: "", revenue: "", spend: "" });
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("daily-growth-coach-v1");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.platform) setPlatform(data.platform);
        if (data.category) setCategory(data.category);
        if (Array.isArray(data.done)) setDone(data.done);
        if (data.facts) setFacts(data.facts);
        if (data.finance) setFinance(data.finance);
        if (Array.isArray(data.rows)) setRows(data.rows);
      }
    } catch { /* ignore damaged local data */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("daily-growth-coach-v1", JSON.stringify({ platform, category, done, facts, finance, rows }));
  }, [category, done, facts, finance, hydrated, platform, rows]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  const titleDraft = useMemo(() => {
    const parts = [facts.brand, facts.material, category, facts.spec, facts.count, facts.scene].map((item) => item.trim()).filter(Boolean);
    return parts.length >= 3 ? parts.join(" ") : "填写至少三个真实商品字段后生成标题草案";
  }, [category, facts]);

  const margin = useMemo(() => {
    const price = n(finance.price);
    const cost = n(finance.cost);
    const shipping = n(finance.shipping);
    const feeRate = n(finance.feeRate) / 100;
    const refundRate = n(finance.refundRate) / 100;
    const budget = n(finance.budget);
    const contribution = price * (1 - feeRate) - cost - shipping;
    const maxCac = Math.max(0, contribution * (1 - refundRate));
    const breakEvenRoas = maxCac ? price / maxCac : 0;
    const testCap = budget > 0 && maxCac > 0 ? Math.min(budget, maxCac) : maxCac;
    const ready = price > 0 && cost > 0;
    return { price, budget, contribution, maxCac, breakEvenRoas, testCap, ready };
  }, [finance]);

  const realReport = useMemo(() => {
    const visitors = rows.reduce((sum, row) => sum + n(row.visitors), 0);
    const orders = rows.reduce((sum, row) => sum + n(row.orders), 0);
    const revenue = rows.reduce((sum, row) => sum + n(row.revenue), 0);
    const spend = rows.reduce((sum, row) => sum + n(row.spend), 0);
    const conversion = pct(orders, visitors);
    const roas = spend ? revenue / spend : 0;
    let diagnosis = "录入第一天数据后开始复盘";
    if (rows.length && visitors === 0) diagnosis = "目前没有访客，先检查商品是否已上架、标题是否覆盖搜索词";
    else if (rows.length && visitors > 0 && orders === 0) diagnosis = "已经有访客但没有订单，先检查价格、主图、规格与购买信任";
    else if (rows.length && conversion < 1) diagnosis = "转化偏弱，下一轮只测试一个主图或详情卖点";
    else if (rows.length) diagnosis = "已经形成真实成交，下一步观察哪个来源带来订单并小幅放大";
    return { visitors, orders, revenue, spend, conversion, roas, diagnosis };
  }, [rows]);

  function addRecord() {
    if (!draft.date) return flash("请先选择日期");
    if (![draft.visitors, draft.orders, draft.revenue, draft.spend].some((value) => value !== "")) return flash("请至少填写一个真实数据");
    setRows((current) => [...current.filter((row) => row.date !== draft.date), draft].sort((a, b) => a.date.localeCompare(b.date)));
    setDraft({ date: today(), visitors: "", orders: "", revenue: "", spend: "" });
    flash("已加入真实经营记录");
  }

  function editRecord(row: DailyRow) {
    setDraft(row);
    flash(`已载入 ${row.date}，修改后再次加入即可覆盖`);
  }

  function removeRecord(date: string) {
    if (!window.confirm(`确定删除 ${date} 的经营记录吗？此操作无法撤销。`)) return;
    setRows((current) => current.filter((row) => row.date !== date));
    flash(`已删除 ${date} 的记录`);
  }

  const nav: { id: View; no: string; label: string }[] = [
    { id: "start", no: "01", label: "7天启动计划" },
    { id: "product", no: "02", label: "商品页生成器" },
    { id: "budget", no: "03", label: "保本预算" },
    { id: "record", no: "04", label: "真实数据记录" },
  ];

  return <div className="product-shell zero-shell">
    {notice && <div className="toast">✓ {notice}</div>}
    <aside className="side-nav">
      <div className="logo"><span>起</span><div><strong>日用增长教练</strong><small>从零开始做电商</small></div></div>
      <nav aria-label="主导航">{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><i>{item.no}</i>{item.label}</button>)}</nav>
      <div className="nav-note"><span>不需要先有数据</span><p>先完成商品事实、页面和小预算测试；有真实访客与订单后，再自动进入复盘。</p></div>
      <div className="operator"><div>GH</div><span><strong>日用品新店</strong><small>抽纸 · 成人尿片</small></span></div>
    </aside>

    <main className="workspace zero-workspace">
      <header className="topbar"><div><span>从零启动 / {category}</span><h1>{nav.find((item) => item.id === view)?.label}</h1></div><div className="top-actions"><span className={rows.length ? "real-tag" : "waiting-tag"}>{rows.length ? `${rows.length}天真实记录` : "暂无经营数据"}</span></div></header>

      {view === "start" && <>
        <section className="zero-hero"><div><span>START WITHOUT DATA</span><h2>你不需要先懂运营，<br/>先把今天这一步做对</h2><p>为抽纸与成人尿片新店准备的7天执行路线。没有真实数据时只给任务，不生成虚假结论。</p></div><div className="start-settings"><label><span>你在哪个平台开店？</span><select value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">请选择平台</option><option>淘宝</option><option>天猫</option><option>拼多多</option><option>抖店</option><option>其他平台</option></select></label><label><span>这7天先主推什么？</span><select value={category} onChange={(e) => setCategory(e.target.value as Category)}><option>抽纸</option><option>成人尿片</option></select></label><small>{platform ? `计划会按${platform}店铺执行；先集中做一个主推款。` : "选择平台后开始；暂时不要求填写任何营业额。"}</small></div></section>
        <section className="start-summary"><article><span>当前阶段</span><strong>商品基础搭建</strong><small>目标不是马上烧广告</small></article><article><span>第一批真实数据</span><strong>访客 · 订单 · 花费</strong><small>从发布后第一天记录</small></article><article><span>本周完成度</span><strong>{done.length}/7</strong><small>完成任务后勾选</small></article></section>
        <section className="panel launch-plan"><div className="panel-head"><div><span>适合新手的执行顺序</span><h3>{category}主推款 · 7天启动计划</h3></div><b>{platform || "待选择平台"}</b></div><div className="launch-days">{plans.map((item, index) => <article key={item[0]} className={done.includes(index) ? "done" : ""}><div className="day-badge">{item[0]}</div><div><span>{item[3]}</span><h3>{item[1]}</h3><p>{item[2]}</p></div><button onClick={() => setDone((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}>{done.includes(index) ? "已完成 ✓" : "标记完成"}</button></article>)}</div></section>
      </>}

      {view === "product" && <>
        <section className="section-intro"><div><span>真实信息优先</span><h2>先写清楚你卖的是什么，再谈流量</h2><p>系统只组合你确认的事实，不自动添加抗菌、医用、治疗等无法证明的卖点。</p></div><label>正在制作<select value={category} onChange={(e) => setCategory(e.target.value as Category)}><option>抽纸</option><option>成人尿片</option></select></label></section>
        <section className="product-builder">
          <article className="panel fact-card"><span>商品事实清单</span><h3>把包装上的真实信息填进来</h3><div className="fact-fields"><label>品牌（没有可不填）<input value={facts.brand} onChange={(e) => setFacts({ ...facts, brand: e.target.value })}/></label><label>材质/原料<input value={facts.material} onChange={(e) => setFacts({ ...facts, material: e.target.value })} placeholder={category === "抽纸" ? "例如：原生木浆" : "例如：无纺布表层"}/></label><label>规格/尺码<input value={facts.spec} onChange={(e) => setFacts({ ...facts, spec: e.target.value })} placeholder={category === "抽纸" ? "例如：180×130mm 3层" : "例如：XL 腰围100-140cm"}/></label><label>数量<input value={facts.count} onChange={(e) => setFacts({ ...facts, count: e.target.value })} placeholder={category === "抽纸" ? "例如：24包×100抽" : "例如：10片/包"}/></label><label>使用场景<input value={facts.scene} onChange={(e) => setFacts({ ...facts, scene: e.target.value })} placeholder={category === "抽纸" ? "例如：家用整箱" : "例如：老人夜用护理"}/></label><label>检测/证明<input value={facts.proof} onChange={(e) => setFacts({ ...facts, proof: e.target.value })} placeholder="没有就留空"/></label></div></article>
          <article className="panel output-card"><span>标题草案</span><h2>{titleDraft}</h2><button onClick={() => navigator.clipboard.writeText(titleDraft).then(() => flash("标题草案已复制"))} disabled={titleDraft.startsWith("填写")}>复制标题</button><div className="keyword-box"><strong>可核对的搜索词</strong><div>{categoryGuide[category].keywords.map((word) => <button key={word} onClick={() => setFacts({ ...facts, scene: facts.scene ? `${facts.scene} ${word}` : word })}>{word}</button>)}</div></div></article>
        </section>
        <section className="builder-grid"><article className="panel checklist"><span>发布前必须确认</span><ul>{categoryGuide[category].facts.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="panel checklist"><span>5张商品图顺序</span><ol>{categoryGuide[category].images.map((item) => <li key={item}>{item}</li>)}</ol></article><article className="panel checklist warning-list"><span>避免退款与违规</span><ul>{categoryGuide[category].warnings.map((item) => <li key={item}>{item}</li>)}</ul></article></section>
      </>}

      {view === "budget" && <>
        <section className="section-intro"><div><span>先算利润再买流量</span><h2>没有正毛利，就不建议投广告</h2><p>只填真实成本。计算结果是测试上限，不是平台承诺。</p></div></section>
        <section className="budget-layout"><article className="panel fact-card"><span>商品成本</span><h3>{category}主推款</h3><div className="fact-fields finance-fields">{([ ["price", "售价"], ["cost", "进货成本"], ["shipping", "运费和包装"], ["feeRate", "平台扣点（%）"], ["refundRate", "预计退款率（%）"], ["budget", "最多能测试多少钱"] ] as [keyof typeof finance, string][]).map(([key, label]) => <label key={key}>{label}<input type="number" min="0" value={finance[key]} onChange={(e) => setFinance({ ...finance, [key]: e.target.value })}/></label>)}</div></article><div className="budget-results">{margin.ready ? <><article className={`margin-result ${margin.contribution > 0 ? "safe" : "loss"}`}><span>每单广告前毛利</span><strong>{money(margin.contribution)}</strong><p>{margin.contribution > 0 ? "可以进入小预算测试，但仍需考虑退款影响。" : "售价不足以覆盖当前成本，请先调整商品结构。"}</p></article><div className="mini-results"><article><span>保本获客成本</span><strong>{money(margin.maxCac)}</strong><small>一个订单最多可承担</small></article><article><span>保本投产比</span><strong>{margin.breakEvenRoas.toFixed(2)}</strong><small>低于此值会亏损</small></article></div><article className="panel stop-card"><span>本轮测试停止线</span><h3>{margin.testCap > 0 ? `本轮最多花 ${money(margin.testCap)}；仍无订单就停止。` : "当前不建议启动付费推广。"}</h3><p>{margin.budget > 0 && margin.maxCac > 0 ? `你填写的总预算是 ${money(margin.budget)}。${margin.budget > margin.maxCac ? "第一轮不要一次花完，剩余预算等复盘后再决定。" : "预算低于保本获客成本，先以预算金额作为停止线。"}` : "填写测试预算后，系统会取预算与保本获客成本中较低的金额作为本轮停止线。"}</p></article></> : <section className="empty-state panel"><div>算</div><span>等待真实成本</span><h2>填写售价和进货成本</h2><p>不再使用任何示例数字；你填写后才会生成保本线。</p></section>}</div></section>
      </>}

      {view === "record" && <>
        <section className="section-intro"><div><span>从第一天建立证据</span><h2>每天记录5个真实数字</h2><p>数据少也没关系。先形成连续记录，7天后再判断客流还是转化有问题。</p></div></section>
        <section className="record-entry panel"><div className="record-fields"><label>日期<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}/></label><label>访客<input type="number" min="0" value={draft.visitors} onChange={(e) => setDraft({ ...draft, visitors: e.target.value })}/></label><label>订单<input type="number" min="0" value={draft.orders} onChange={(e) => setDraft({ ...draft, orders: e.target.value })}/></label><label>营业额<input type="number" min="0" value={draft.revenue} onChange={(e) => setDraft({ ...draft, revenue: e.target.value })}/></label><label>广告花费<input type="number" min="0" value={draft.spend} onChange={(e) => setDraft({ ...draft, spend: e.target.value })}/></label><button onClick={addRecord}>加入记录</button></div></section>
        {rows.length ? <><section className="real-summary"><article><span>真实访客</span><strong>{realReport.visitors}</strong></article><article><span>真实订单</span><strong>{realReport.orders}</strong></article><article><span>支付转化率</span><strong>{realReport.conversion.toFixed(2)}%</strong></article><article><span>广告投产</span><strong>{realReport.roas.toFixed(2)}</strong></article></section><section className="panel real-diagnosis"><span>当前仅基于已录入数据</span><h2>{realReport.diagnosis}</h2><p>累计营业额 {money(realReport.revenue)}，广告花费 {money(realReport.spend)}。达到7天前只做观察，不轻易下结论。</p></section><section className="panel record-table"><table><thead><tr><th>日期</th><th>访客</th><th>订单</th><th>营业额</th><th>广告花费</th><th>操作</th></tr></thead><tbody>{rows.map((row) => <tr key={row.date}><td>{row.date}</td><td>{row.visitors || "—"}</td><td>{row.orders || "—"}</td><td>{row.revenue || "—"}</td><td>{row.spend || "—"}</td><td><div className="record-actions"><button onClick={() => editRecord(row)}>修改</button><button className="danger" onClick={() => removeRecord(row.date)}>删除</button></div></td></tr>)}</tbody></table></section></> : <section className="empty-state panel"><div>真</div><span>没有虚构数据</span><h2>你的第一条记录会从这里开始</h2><p>商品发布后，每天从卖家后台抄录访客、订单、营业额和广告花费。工具不会在没有数据时生成经营结论。</p></section>}
      </>}
      <footer><span>建议基于商品事实和你录入的真实数据，不保证销售结果。</span><span>抽纸与成人尿片的规格、功效和检测信息必须如实填写。</span></footer>
    </main>
  </div>;
}
