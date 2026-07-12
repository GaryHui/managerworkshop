"use client";

import { useMemo, useState } from "react";
import CategoryGrowth from "./CategoryGrowth";
import LinkLab from "./LinkLab";

type Store = { id: number; name: string; platform: string; kind: string; role: string; color: string; sales: number; profit: number; products: number; tasks: number; status: string };
type Product = { id: number; name: string; sku: string; type: "自有品牌" | "第三方"; store: string; price: number; cost: number; stock: number; sales: number; status: string; channel: string };

const stores: Store[] = [
  { id: 1, name: "淘宝品牌旗舰店", platform: "淘宝", kind: "企业店", role: "品牌形象 · 新品首发 · 高毛利", color: "#ff6a2b", sales: 186420, profit: 48760, products: 24, tasks: 3, status: "运营中" },
  { id: 2, name: "拼多多品牌店", platform: "拼多多", kind: "企业店", role: "走量爆品 · 性价比套装 · 拉新", color: "#e9342f", sales: 263580, profit: 39120, products: 18, tasks: 5, status: "运营中" },
  { id: 3, name: "精选好物店", platform: "淘宝", kind: "个人店", role: "第三方测品 · 长尾获客 · 分销", color: "#6d5dfc", sales: 92760, profit: 17340, products: 36, tasks: 2, status: "运营中" },
];

const seedProducts: Product[] = [
  { id: 1, name: "云感柔韧抽纸 24包", sku: "OWN-TP-024", type: "自有品牌", store: "淘宝品牌旗舰店", price: 59.9, cost: 28.4, stock: 1260, sales: 438, status: "主推", channel: "品牌款" },
  { id: 2, name: "云感柔韧抽纸 36包", sku: "OWN-PDD-036", type: "自有品牌", store: "拼多多品牌店", price: 49.9, cost: 31.2, stock: 2380, sales: 1028, status: "爆款", channel: "走量款" },
  { id: 3, name: "亲肤洗脸巾 6卷", sku: "OWN-TB-006", type: "自有品牌", store: "淘宝品牌旗舰店", price: 42.9, cost: 17.6, stock: 580, sales: 219, status: "增长", channel: "新品" },
  { id: 4, name: "便携式桌面风扇", sku: "DST-FAN-01", type: "第三方", store: "精选好物店", price: 39.9, cost: 24.8, stock: 210, sales: 86, status: "测品", channel: "季节品" },
  { id: 5, name: "厨房去污湿巾 80片", sku: "DST-WIP-80", type: "第三方", store: "精选好物店", price: 19.9, cost: 10.6, stock: 460, sales: 164, status: "稳定", channel: "引流款" },
  { id: 6, name: "植萃洗衣凝珠 60颗", sku: "OWN-PDD-060", type: "自有品牌", store: "拼多多品牌店", price: 29.9, cost: 18.2, stock: 920, sales: 374, status: "主推", channel: "拉新款" },
];

const taskSeed = [
  { title: "抽纸36包报名百亿补贴", store: "拼多多品牌店", due: "今天 18:00", owner: "运营", level: "紧急" },
  { title: "洗脸巾新品主图 A/B 测试", store: "淘宝品牌旗舰店", due: "明天", owner: "设计", level: "进行中" },
  { title: "桌面风扇测品复盘", store: "精选好物店", due: "7月14日", owner: "选品", level: "待处理" },
  { title: "核对抽纸库存与活动销量", store: "拼多多品牌店", due: "7月15日", owner: "供应链", level: "待处理" },
];

const money = (n: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [tab, setTab] = useState("总览");
  const [products, setProducts] = useState(seedProducts);
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("全部店铺");
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", type: "自有品牌" as Product["type"], store: stores[0].name, price: "", cost: "", stock: "" });
  const [audit, setAudit] = useState({ url: "", platform: "淘宝", keyword: "", title: "", sellingPoints: "", competitorNotes: "", impressions: "12000", clicks: "228", carts: "31", orders: "8", price: "49.9", competitor: "45.9" });
  const [auditDone, setAuditDone] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = useMemo(() => products.filter(p => (storeFilter === "全部店铺" || p.store === storeFilter) && `${p.name}${p.sku}`.toLowerCase().includes(query.toLowerCase())), [products, query, storeFilter]);
  const totalSales = stores.reduce((a, s) => a + s.sales, 0);
  const totalProfit = stores.reduce((a, s) => a + s.profit, 0);

  function flash(text: string) { setNotice(text); window.setTimeout(() => setNotice(""), 2400); }
  function addProduct() {
    if (!newProduct.name || !newProduct.price || !newProduct.cost) return flash("请补全商品名称、售价和成本");
    setProducts(p => [...p, { id: Date.now(), name: newProduct.name, sku: newProduct.sku || `SKU-${Date.now().toString().slice(-5)}`, type: newProduct.type, store: newProduct.store, price: +newProduct.price, cost: +newProduct.cost, stock: +newProduct.stock || 0, sales: 0, status: "待推广", channel: newProduct.type === "自有品牌" ? "品牌款" : "测品" }]);
    setShowAdd(false); setNewProduct({ name: "", sku: "", type: "自有品牌", store: stores[0].name, price: "", cost: "", stock: "" }); flash("商品已加入经营计划");
  }
  const impressions = Number(audit.impressions) || 0, clicks = Number(audit.clicks) || 0, carts = Number(audit.carts) || 0, orders = Number(audit.orders) || 0;
  const ctr = impressions ? clicks / impressions * 100 : 0, cartRate = clicks ? carts / clicks * 100 : 0, conversion = clicks ? orders / clicks * 100 : 0;
  const priceGap = Number(audit.competitor) ? (Number(audit.price) / Number(audit.competitor) - 1) * 100 : 0;
  const bottleneck = impressions < 5000 ? "曝光不足" : ctr < 2 ? "点击率偏低" : conversion < 3 ? "成交转化偏低" : "流量结构基本健康";
  function runAudit() { if (!audit.url.trim()) return flash("请先粘贴淘宝或拼多多商品链接"); setAuditDone(true); flash("诊断完成，已生成7天提升计划"); }
  async function runAiAudit() {
    if (!audit.url.trim()) return flash("请先粘贴商品链接");
    setAiLoading(true); setAiReport("");
    try {
      const res = await fetch("/api/ai-diagnose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...audit, metrics: { impressions, clicks, carts, orders, price: Number(audit.price), competitor: Number(audit.competitor) } }) });
      const data = await res.json() as { report?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "AI分析失败");
      setAiReport(data.report || "未生成分析结果"); setAuditDone(true);
    } catch (error) { flash(error instanceof Error ? error.message : "AI分析失败"); }
    finally { setAiLoading(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">营</div><div><strong>全店经营舱</strong><span>多店铺管理中心</span></div></div>
      <nav>{["总览", "店铺分工", "商品中心", "链接测试", "品类获客", "流量诊断", "AI分析", "推广任务", "价格与利润"].map((item, i) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span className="nav-icon">{["⌂", "店", "品", "链", "流", "诊", "AI", "✓", "¥"][i]}</span>{item}{item === "推广任务" && <b>10</b>}</button>)}</nav>
      <div className="side-card"><span>本月经营目标</span><strong>¥ 650,000</strong><div className="progress"><i style={{ width: "83%" }} /></div><small>已完成 83% · 还差 ¥107,240</small></div>
      <div className="profile"><div className="avatar">李</div><div><strong>经营负责人</strong><span>所有店铺权限</span></div><button>•••</button></div>
    </aside>

    <main>
      <header><div><p>2026年7月12日 · 周日</p><h1>{tab}</h1></div><div className="header-actions"><label className="search">⌕<input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索商品或 SKU" /></label><button className="bell">♢<i /></button><button className="primary" onClick={() => setShowAdd(true)}>＋ 添加商品</button></div></header>
      {notice && <div className="toast">✓ {notice}</div>}

      {tab === "总览" && <>
        <section className="hero"><div><span className="eyebrow">今日经营简报</span><h2>三个店铺定位清晰，<em>拼多多店正在拉动增长</em></h2><p>本月总销售额已完成目标的 83%。建议优先处理 2 个低库存商品，并推进拼多多百亿补贴报名。</p><div className="hero-actions"><button className="primary" onClick={() => setTab("推广任务")}>查看今日任务 →</button><button onClick={() => setTab("店铺分工")}>查看店铺策略</button></div></div><div className="pulse"><div className="pulse-ring"><strong>83%</strong><span>目标进度</span></div></div></section>
        <section className="metrics">
          <article><span>本月销售额</span><strong>{money(totalSales)}</strong><small className="up">↑ 18.6% 较上月</small></article>
          <article><span>预估贡献利润</span><strong>{money(totalProfit)}</strong><small className="up">↑ 12.4% 较上月</small></article>
          <article><span>在售商品</span><strong>{stores.reduce((a,s)=>a+s.products,0)} <i>款</i></strong><small>自有品牌 42 · 第三方 36</small></article>
          <article><span>待办任务</span><strong>10 <i>项</i></strong><small className="warn">其中 3 项今日到期</small></article>
        </section>
        <div className="grid-2">
          <section className="panel"><div className="panel-head"><div><h3>店铺经营表现</h3><p>各店定位与本月经营结果</p></div><button onClick={() => setTab("店铺分工")}>管理分工 →</button></div><div className="store-list">{stores.map(s => <div className="store-row" key={s.id}><div className="platform" style={{ background: s.color }}>{s.platform === "拼多多" ? "拼" : "淘"}</div><div className="store-main"><strong>{s.name}<span>{s.kind}</span></strong><p>{s.role}</p></div><div className="store-stat"><span>销售额</span><strong>{money(s.sales)}</strong></div><div className="store-stat"><span>贡献利润</span><strong>{money(s.profit)}</strong></div><div className="trend"><i style={{height:"42%"}}/><i style={{height:"58%"}}/><i style={{height:"48%"}}/><i style={{height:"74%"}}/><i style={{height:"66%"}}/><i style={{height:"92%"}}/></div></div>)}</div></section>
          <section className="panel"><div className="panel-head"><div><h3>今日行动清单</h3><p>按经营影响排序</p></div><button onClick={() => setTab("推广任务")}>全部任务 →</button></div><div className="task-list">{taskSeed.slice(0,3).map((t,i)=><div className="task" key={t.title}><button onClick={e => {e.currentTarget.classList.toggle("done"); flash("任务状态已更新")}}>✓</button><div><strong>{t.title}</strong><span>{t.store} · {t.owner}</span></div><em className={i===0?"urgent":""}>{t.due}</em></div>)}</div><div className="insight"><span>经营建议</span><p>拼多多店抽纸36包近7天销量增长 <strong>26%</strong>，库存仅够约12天，建议今天确认补货。</p></div></section>
        </div>
      </>}

      {tab === "店铺分工" && <section className="content-section"><div className="section-title"><div><h2>一店一定位，减少内部竞争</h2><p>给每个店明确客群、产品和价格角色，商品冲突会自动提示。</p></div><button className="primary" onClick={() => flash("店铺分工方案已保存")}>保存分工方案</button></div><div className="strategy-grid">{stores.map((s,i)=><article className="strategy-card" key={s.id} style={{"--accent":s.color} as React.CSSProperties}><div className="strategy-top"><div className="platform" style={{background:s.color}}>{s.platform === "拼多多" ? "拼" : "淘"}</div><div><h3>{s.name}</h3><span>{s.platform} · {s.kind}</span></div><b>{s.status}</b></div><label>核心定位</label><h4>{s.role}</h4><div className="tag-row">{(i===0?["自有品牌","新品","高毛利","品牌词"]:i===1?["自有品牌","爆品","套装","低价拉新"]:["第三方产品","测品","长尾词","佣金利润"]).map(x=><span key={x}>{x}</span>)}</div><div className="strategy-numbers"><div><span>商品数</span><strong>{s.products}</strong></div><div><span>本月销售额</span><strong>{money(s.sales)}</strong></div><div><span>利润率</span><strong>{Math.round(s.profit/s.sales*100)}%</strong></div></div><button onClick={() => flash(`正在编辑「${s.name}」的经营范围`)}>编辑经营范围</button></article>)}</div><div className="rule-panel"><div><span>分工规则</span><h3>系统会用这些原则检查商品安排</h3></div><ul><li><b>品牌优先</b> 自有品牌默认进入企业店，避免个人店分散品牌权重</li><li><b>价格隔离</b> 同款在不同平台采用不同规格或套装，减少直接比价</li><li><b>测品转正</b> 第三方商品连续14天达标后，提示扩大投放或开发自有款</li><li><b>冲突提醒</b> 同一SKU分配到多个定位相同的店铺时自动预警</li></ul></div></section>}

      {tab === "商品中心" && <section className="content-section"><div className="section-title"><div><h2>商品与店铺归属</h2><p>每个商品只设一个主推店铺，其他店铺承担辅助或差异化角色。</p></div><button className="primary" onClick={() => setShowAdd(true)}>＋ 添加商品</button></div><div className="filters"><select value={storeFilter} onChange={e=>setStoreFilter(e.target.value)}><option>全部店铺</option>{stores.map(s=><option key={s.id}>{s.name}</option>)}</select><button className="selected">全部 {products.length}</button><button>自有品牌</button><button>第三方</button><span>{filtered.length} 条结果</span></div><div className="table-wrap"><table><thead><tr><th>商品</th><th>类型</th><th>主推店铺</th><th>售价 / 成本</th><th>贡献毛利</th><th>库存</th><th>近30日销量</th><th>状态</th><th></th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><div className="product-name"><div>{p.name.slice(0,1)}</div><span><strong>{p.name}</strong><small>{p.sku} · {p.channel}</small></span></div></td><td><span className={`type ${p.type==="自有品牌"?"own":"third"}`}>{p.type}</span></td><td>{p.store}</td><td><strong>¥{p.price}</strong><small className="block">成本 ¥{p.cost}</small></td><td><strong>{Math.round((p.price-p.cost)/p.price*100)}%</strong><small className="block">¥{(p.price-p.cost).toFixed(1)}/件</small></td><td><strong>{p.stock}</strong><small className={`block ${p.stock<600?"low":""}`}>{p.stock<600?"库存偏低":"库存充足"}</small></td><td><strong>{p.sales}</strong></td><td><span className="status">{p.status}</span></td><td><button className="more" onClick={()=>flash(`已打开「${p.name}」经营详情`)}>•••</button></td></tr>)}</tbody></table></div></section>}

      {tab === "流量诊断" && <section className="content-section"><div className="section-title"><div><h2>商品链接流量诊断</h2><p>粘贴自己的商品链接，结合近7天数据判断问题出在曝光、点击还是成交。</p></div><span className="safe-note">不需要店铺密码</span></div><div className="audit-layout"><div className="panel audit-form"><div className="audit-step"><span>1</span><div><h3>添加商品</h3><p>支持淘宝、天猫和拼多多链接</p></div></div><label>平台<select value={audit.platform} onChange={e=>setAudit({...audit,platform:e.target.value})}><option>淘宝</option><option>天猫</option><option>拼多多</option></select></label><label>商品链接<input value={audit.url} onChange={e=>{setAudit({...audit,url:e.target.value});setAuditDone(false)}} placeholder="粘贴商品详情页链接" /></label><label>主推关键词<input value={audit.keyword} onChange={e=>setAudit({...audit,keyword:e.target.value})} placeholder="例如：加厚纯棉洗脸巾" /></label><div className="audit-step"><span>2</span><div><h3>填写近7天数据</h3><p>从淘宝或拼多多后台复制即可</p></div></div><div className="input-grid">{[["曝光量","impressions"],["点击量","clicks"],["收藏加购","carts"],["支付订单","orders"],["你的到手价","price"],["竞品中位价","competitor"]].map(([label,key])=><label key={key}>{label}<input type="number" value={audit[key as keyof typeof audit]} onChange={e=>setAudit({...audit,[key]:e.target.value})} /></label>)}</div><button className="primary audit-submit" onClick={runAudit}>开始诊断并生成方案 →</button></div><div className="audit-results">{!auditDone?<div className="audit-empty"><div>诊</div><h3>等待诊断</h3><p>填写商品链接和近7天数据后，系统会生成流量漏斗、问题判断和7天行动方案。</p><ul><li>曝光与关键词机会</li><li>主图点击率诊断</li><li>价格和成交转化诊断</li><li>逐日获客提升任务</li></ul></div>:<><div className="diagnosis-head"><div><span>诊断结论</span><h2>{bottleneck}</h2><p>{audit.platform} · {audit.keyword || "暂未填写关键词"}</p></div><strong>{bottleneck==="流量结构基本健康"?"健康":"需优化"}</strong></div><div className="funnel">{[["曝光",impressions.toLocaleString(),100],["点击率",`${ctr.toFixed(2)}%`,Math.max(15,ctr*25)],["加购率",`${cartRate.toFixed(2)}%`,Math.max(15,cartRate*5)],["成交率",`${conversion.toFixed(2)}%`,Math.max(15,conversion*12)]].map(x=><div key={x[0] as string}><span>{x[0]}</span><strong>{x[1]}</strong><i style={{width:`${Math.min(100,Number(x[2]))}%`}} /></div>)}</div><div className="finding-grid"><article><span>搜索与曝光</span><strong>{impressions<5000?"曝光不足":"已有基础曝光"}</strong><p>{impressions<5000?"增加精准长尾词覆盖，先获得高意向搜索流量。":"保持核心词，增加2—3个精准长尾词。"}</p></article><article><span>主图与点击</span><strong>{ctr<2?"主图吸引力不足":"点击表现尚可"}</strong><p>{ctr<2?"首图只突出一个核心利益点，制作两套图片对照测试。":"保留当前主图，再测试一套使用结果图。"}</p></article><article><span>价格竞争</span><strong>{priceGap>5?`高于竞品 ${priceGap.toFixed(1)}%`:"价格具有竞争力"}</strong><p>{priceGap>5?"先测试小规格、优惠券或赠品，不要直接跟随降价。":"把利润用于精准关键词和内容测试。"}</p></article><article><span>成交承接</span><strong>{conversion<3?"转化链路偏弱":"成交表现良好"}</strong><p>{conversion<3?"补充规格对比、使用场景、发货承诺和常见疑问。":"逐步扩大高转化关键词预算。"}</p></article></div><div className="action-plan"><div className="panel-head"><div><h3>7天获客提升计划</h3><p>一次只改一个变量，才能判断有效动作</p></div><button onClick={()=>flash("计划已加入推广任务")}>加入任务 →</button></div>{[["第1天","确定1个核心词和5个精准长尾词","关键词"],["第2天","制作核心卖点版与使用结果版首图","素材"],["第3—4天","小预算测试点击率，暂停低点击词","投放"],["第5天","优化规格对比、评价展示和发货承诺","转化"],["第6—7天","复盘曝光、点击、加购、成交和利润","复盘"]].map(x=><div className="plan-row" key={x[0]}><b>{x[0]}</b><span>{x[1]}</span><em>{x[2]}</em><button onClick={()=>flash(`${x[0]}任务已标记`)}>○</button></div>)}</div></>}</div></div><div className="audit-tip"><strong>说明</strong><span>工具不会承诺“保证涨流量”，而是根据真实漏斗找出最可能的问题，用小范围实验验证，避免盲目降价或烧推广费。</span></div></section>}

      {tab === "推广任务" && <section className="content-section"><div className="section-title"><div><h2>推广任务看板</h2><p>把选品、素材、活动、投放和复盘安排到具体店铺。</p></div><button className="primary" onClick={()=>flash("新任务已创建")}>＋ 新建任务</button></div><div className="kanban">{["待处理","进行中","已完成"].map((col,ci)=><div className="kanban-col" key={col}><h3>{col}<span>{ci===0?3:ci===1?2:4}</span></h3>{taskSeed.filter((_,i)=>ci===2?i===3:i%3===ci).map((t,i)=><article key={t.title}><div><span className={t.level==="紧急"?"red":""}>{t.level}</span><button>•••</button></div><h4>{t.title}</h4><p>{t.store}</p><footer><span>{t.owner}</span><em>{t.due}</em></footer></article>)}{ci===1&&<article><div><span>进行中</span><button>•••</button></div><h4>第三方厨房湿巾搜索词优化</h4><p>精选好物店</p><footer><span>投放</span><em>7月16日</em></footer></article>}</div>)}</div></section>}

      {tab === "AI分析" && <section className="content-section"><div className="section-title"><div><h2>千问AI商品分析</h2><p>结合商品标题、卖点、竞品资料和经营漏斗，生成深度优化方案。</p></div><span className="safe-note">密钥只保存在服务端</span></div><div className="ai-layout"><div className="panel ai-form"><label>商品链接<input value={audit.url} onChange={e=>setAudit({...audit,url:e.target.value})} placeholder="淘宝、天猫或拼多多链接" /></label><label>商品标题<input value={audit.title} onChange={e=>setAudit({...audit,title:e.target.value})} placeholder="从商品页面复制完整标题" /></label><label>核心卖点<textarea value={audit.sellingPoints} onChange={e=>setAudit({...audit,sellingPoints:e.target.value})} placeholder="材质、规格、适用人群、赠品和差异点" /></label><label>竞品观察<textarea value={audit.competitorNotes} onChange={e=>setAudit({...audit,competitorNotes:e.target.value})} placeholder="竞品标题、价格、规格和主要卖点" /></label><label>目标关键词<input value={audit.keyword} onChange={e=>setAudit({...audit,keyword:e.target.value})} placeholder="多个关键词用逗号分隔" /></label><button className="primary" disabled={aiLoading} onClick={runAiAudit}>{aiLoading?"千问正在分析…":"开始千问AI分析 →"}</button></div><div className="ai-output">{aiReport?<><span>AI诊断报告</span><div>{aiReport}</div></>:<div className="ai-placeholder"><b>AI</b><h3>等待商品资料</h3><p>第一版接入千问文本分析；浏览器采集助手完成后，将自动带入标题、主图、规格和竞品资料。</p><ul><li>标题与精准关键词</li><li>卖点和竞品差异</li><li>价格与转化风险</li><li>7天增长实验</li></ul></div>}</div></div></section>}

      {tab === "价格与利润" && <section className="content-section"><div className="section-title"><div><h2>价格与利润护栏</h2><p>先守住利润底线，再决定是否参与价格竞争。</p></div><button className="primary" onClick={()=>flash("利润底线已重新计算")}>重新计算</button></div><div className="profit-cards"><article><span>整体贡献利润率</span><strong>19.5%</strong><small className="up">↑ 1.8% 较上月</small></article><article><span>低于利润底线</span><strong>2 款</strong><small className="warn">建议立即检查</small></article><article><span>可参与活动商品</span><strong>31 款</strong><small>库存和利润均达标</small></article></div><div className="grid-2"><div className="panel calculator"><div className="panel-head"><div><h3>活动价格试算</h3><p>输入活动价，快速判断是否值得参加</p></div></div><label>选择商品<select><option>云感柔韧抽纸 36包</option><option>亲肤洗脸巾 6卷</option></select></label><div className="input-grid"><label>日常售价<input defaultValue="49.90" /></label><label>活动到手价<input defaultValue="42.90" /></label><label>商品成本<input defaultValue="31.20" /></label><label>平台及履约费用<input defaultValue="5.10" /></label></div><div className="calc-result"><div><span>活动单件贡献利润</span><strong>¥6.60</strong></div><div><span>活动贡献利润率</span><strong>15.4%</strong></div><em>可参加</em></div></div><div className="panel"><div className="panel-head"><div><h3>利润风险商品</h3><p>按风险程度排序</p></div></div>{products.slice(3,6).map((p,i)=><div className="risk" key={p.id}><div className="risk-icon">{i===0?"!":"¥"}</div><div><strong>{p.name}</strong><span>{p.store}</span></div><div><strong>{Math.round((p.price-p.cost)/p.price*100)}%</strong><span>当前毛利率</span></div><button onClick={()=>flash("已加入价格调整任务")}>处理</button></div>)}</div></div></section>}
      {tab === "品类获客" && <CategoryGrowth />}
      {tab === "链接测试" && <LinkLab />}
    </main>

    {showAdd && <div className="modal-backdrop" onMouseDown={()=>setShowAdd(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>添加商品</h2><p>建立商品档案并指定主推店铺</p></div><button onClick={()=>setShowAdd(false)}>×</button></div><div className="form"><label>商品名称<input value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})} placeholder="例如：云感抽纸 24包" /></label><label>SKU<input value={newProduct.sku} onChange={e=>setNewProduct({...newProduct,sku:e.target.value})} placeholder="不填将自动生成" /></label><div className="input-grid"><label>商品类型<select value={newProduct.type} onChange={e=>setNewProduct({...newProduct,type:e.target.value as Product["type"]})}><option>自有品牌</option><option>第三方</option></select></label><label>主推店铺<select value={newProduct.store} onChange={e=>setNewProduct({...newProduct,store:e.target.value})}>{stores.map(s=><option key={s.id}>{s.name}</option>)}</select></label><label>销售价<input type="number" value={newProduct.price} onChange={e=>setNewProduct({...newProduct,price:e.target.value})} placeholder="0.00" /></label><label>商品成本<input type="number" value={newProduct.cost} onChange={e=>setNewProduct({...newProduct,cost:e.target.value})} placeholder="0.00" /></label></div><label>当前库存<input type="number" value={newProduct.stock} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})} placeholder="0" /></label></div><div className="modal-foot"><button onClick={()=>setShowAdd(false)}>取消</button><button className="primary" onClick={addProduct}>确认添加</button></div></div></div>}
  </div>;
}
