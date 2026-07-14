"use client";

import { useEffect, useMemo, useState } from "react";

type View = "create" | "audit" | "package" | "launch" | "diagnose";
type Category = "抽纸" | "成人尿片" | "其他日用品";
type Product = {
  url: string; platform: string; category: Category; title: string; brand: string;
  material: string; spec: string; count: string; audience: string; scene: string;
  price: string; cost: string; shipping: string; proof: string; pain: string;
  feeRate: string; adCost: string; targetProfit: string; extraShipping: string;
};
type InspectResult = { status?: string; message?: string; platform?: string; title?: string; price?: string; productId?: string };
type Traffic = { indexed: "unknown" | "yes" | "no"; impressions: string; clicks: string; carts: string; orders: string; spend: string };

const emptyProduct: Product = {
  url: "", platform: "", category: "抽纸", title: "", brand: "", material: "",
  spec: "", count: "", audience: "家庭日常使用", scene: "家庭囤货", price: "",
  cost: "", shipping: "", proof: "", pain: "", feeRate: "", adCost: "",
  targetProfit: "", extraShipping: "",
};

const categoryData: Record<Category, {
  search: string[]; images: string[]; questions: string[]; risks: string[]; audience: string[];
}> = {
  "抽纸": {
    search: ["抽纸", "家用抽纸", "整箱抽纸", "原生木浆抽纸", "家庭囤货"],
    audience: ["家庭日常使用", "办公室采购", "租房囤货", "母婴家庭（需有依据）"],
    images: ["主图：整箱数量＋单包规格＋一个购买理由", "规格图：包数×抽数×层数，避免张/抽混淆", "尺寸图：用尺子展示单张真实尺寸", "场景图：餐桌、卧室或办公室真实使用", "承诺图：发货规格、破损补发与售后说明"],
    questions: ["一包多少抽、几层？", "单张尺寸是多少？", "整箱一共有多少包？", "纸张原料是什么？", "发货规格与图片一致吗？"],
    risks: ["没有检测依据不要写抗菌、食品级、婴儿专用", "标题、主图和SKU中的包数必须一致", "不要用夸张低价掩盖小规格"],
  },
  "成人尿片": {
    search: ["成人尿片", "成人纸尿裤", "老人纸尿裤", "夜用成人尿裤", "护理尿片"],
    audience: ["居家照护家庭", "老人夜间护理", "术后行动不便人群", "养老护理机构"],
    images: ["主图：尺码＋片数＋日用/夜用定位", "尺码图：腰围测量方法和选码建议", "结构图：只展示有依据的吸收与防漏设计", "场景图：照护者更换步骤与注意事项", "承诺图：生产信息、隐私发货和售后说明"],
    questions: ["腰围多少选这个尺码？", "一包多少片？", "适合日用还是夜用？", "如何减少选错尺码？", "拆包后是否支持售后？"],
    risks: ["护理用品不能宣传治疗疾病", "吸收量、抑菌、透气等描述必须有依据", "尺码范围必须在主图和详情页重复说明"],
  },
  "其他日用品": {
    search: ["家用", "日用品", "实惠装", "家庭装", "囤货装"],
    audience: ["家庭日常使用", "办公室采购", "租房人群", "团购用户"],
    images: ["主图：品类＋规格＋一个购买理由", "规格图：数量、尺寸和材质", "细节图：真实质感与使用方式", "场景图：目标消费者使用情景", "承诺图：发货内容和售后说明"],
    questions: ["实际发货包含什么？", "尺寸和数量是多少？", "材质是什么？", "适合什么场景？", "售后规则是什么？"],
    risks: ["所有功效必须有真实依据", "标题、图片和SKU必须一致", "不得使用虚构销量和虚假限时"],
  },
};

const n = (value: string) => Math.max(0, Number(value) || 0);
const money = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 1 }).format(value);

export default function Home() {
  const [view, setView] = useState<View>("create");
  const [product, setProduct] = useState<Product>(emptyProduct);
  const [inspecting, setInspecting] = useState(false);
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [generated, setGenerated] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [traffic, setTraffic] = useState<Traffic>({ indexed: "unknown", impressions: "", clicks: "", carts: "", orders: "", spend: "" });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("listing-growth-agent-v1");
      if (saved) {
        const data = JSON.parse(saved) as { product?: Product; done?: number[]; generated?: boolean; traffic?: Traffic };
        if (data.product) setProduct({ ...emptyProduct, ...data.product });
        if (Array.isArray(data.done)) setDone(data.done);
        if (data.generated) setGenerated(true);
        if (data.traffic) setTraffic((current) => ({ ...current, ...data.traffic }));
      }
    } catch { /* damaged device draft is ignored */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("listing-growth-agent-v1", JSON.stringify({ product, done, generated, traffic }));
  }, [done, generated, hydrated, product, traffic]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function update<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((current) => ({ ...current, [key]: value }));
    setGenerated(false);
  }

  async function inspectLink() {
    if (!product.url.trim()) return flash("请先粘贴淘宝、天猫或拼多多商品链接");
    setInspecting(true);
    setInspect(null);
    try {
      const response = await fetch("/api/inspect-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: product.url.trim() }) });
      const data = await response.json() as InspectResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "链接读取失败");
      setInspect(data);
      setProduct((current) => ({ ...current, platform: data.platform || current.platform, title: data.title || current.title, price: data.price || current.price }));
      flash(data.status === "captured" ? "已读取公开商品字段，请逐项核对" : "已识别链接，请手动补齐平台未公开的字段");
    } catch (error) {
      setInspect({ status: "partial", message: error instanceof Error ? error.message : "平台限制读取，请手动填写" });
      flash("平台未返回公开详情，可以继续手动创建上架方案");
    } finally { setInspecting(false); }
  }

  const knownFacts = useMemo(() => [product.platform, product.category, product.material, product.spec, product.count, product.audience, product.price].filter((value) => value.trim()).length, [product]);
  const margin = n(product.price) * (1 - Math.min(50, n(product.feeRate)) / 100) - n(product.cost) - n(product.shipping) - n(product.adCost);
  const ready = Boolean(product.platform && product.spec && product.count && n(product.price) > 0);
  const guide = categoryData[product.category];

  const titleBase = useMemo(() => {
    const parts = [product.brand, product.material, product.category, product.spec, product.count, product.scene].map((value) => value.trim()).filter(Boolean);
    return parts.join(" ");
  }, [product]);
  const titles = [
    titleBase,
    [product.brand, product.category, product.scene, product.spec, product.count].filter(Boolean).join(" "),
    [product.category, product.audience, product.material, product.spec, product.count].filter(Boolean).join(" "),
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  const checks = [
    { label: "平台与类目", pass: Boolean(product.platform && product.category), detail: product.platform ? `${product.platform} · ${product.category}` : "还未选择首发平台" },
    { label: "核心规格", pass: Boolean(product.spec && product.count), detail: product.spec && product.count ? `${product.spec} · ${product.count}` : "规格和数量必须同时填写" },
    { label: "搜索相关性", pass: titles[0]?.includes(product.category) && titles[0]?.length >= 12, detail: titles[0] || "生成后检查标题" },
    { label: "利润边界", pass: n(product.cost) > 0 && margin > 0, detail: n(product.cost) ? `扣除已填写成本后每单余量 ${money(margin)}` : "未填写进货成本，不能判断是否值得推广" },
    { label: "功效依据", pass: product.category === "其他日用品" || Boolean(product.proof) || !/抗菌|抑菌|医用|治疗|大吸量/.test(`${product.title}${product.scene}`), detail: product.proof || "没有证明时，不使用功效承诺" },
    { label: "消费者问题", pass: Boolean(product.pain.trim()), detail: product.pain || "至少填写一个消费者顾虑或竞品差评" },
  ];
  const preparation = Math.round(checks.filter((item) => item.pass).length / checks.length * 100);

  const feeRate = Math.min(50, n(product.feeRate)) / 100;
  const targetAdCost = n(product.adCost);
  const targetProfit = n(product.targetProfit);
  const extraShipping = n(product.extraShipping);
  const currentContribution = n(product.price) * (1 - feeRate) - n(product.cost) - n(product.shipping) - targetAdCost;
  const pricingProfitTarget = product.targetProfit ? targetProfit : Math.max(0, currentContribution);
  const pricePlans = useMemo(() => {
    const unitCost = n(product.cost);
    const baseShipping = n(product.shipping);
    const fee = Math.min(50, n(product.feeRate)) / 100;
    const denominator = Math.max(0.5, 1 - fee);
    if (!unitCost) return [];
    return [
      { type: "引流装", quantity: 1, role: "降低首次购买门槛，先验证点击和成交" },
      { type: "主推装", quantity: 2, role: "分摊首重运费与推广成本，作为默认选中SKU" },
      { type: "囤货装", quantity: 3, role: "提高客单价，突出每组单价和节省金额" },
    ].map((item) => {
      const fulfilment = unitCost * item.quantity + baseShipping + n(product.extraShipping) * Math.max(0, item.quantity - 1);
      const profitGoal = product.targetProfit ? n(product.targetProfit) : Math.max(0, n(product.price) * (1 - fee) - unitCost - baseShipping - n(product.adCost));
      const floor = (fulfilment + n(product.adCost) + profitGoal) / denominator;
      const testPrice = Math.max(floor, Math.ceil(floor) - 0.1);
      return { ...item, floor, testPrice, unitPrice: testPrice / item.quantity };
    });
  }, [product.adCost, product.cost, product.extraShipping, product.feeRate, product.price, product.shipping, product.targetProfit]);

  const launchPlan = [
    ["发布资格", "补齐类目、规格、数量、成本与售后", `当前准备度 ${preparation}%，未通过项先处理`],
    ["搜索收录", `发布标题A：${titles[0] || "先生成标题"}`, "24小时内只确认是否收录，不伪造搜索量"],
    ["主图测试", `使用“${guide.images[0]}”`, "只更换首图，不同时改价格"],
    ["购买理由", `围绕“${product.pain || guide.questions[0]}”补一张详情图`, "回答顾虑，不堆砌空泛卖点"],
    ["站外内容", `发布1条${product.scene || "真实使用"}短视频`, "展示真实规格，并引导回商品页"],
    ["小预算测试", margin > 0 ? `单轮花费不超过 ${money(Math.max(0, margin))}` : "毛利未确认前不投付费流量", "一轮只验证一个流量入口"],
    ["保留赢家", "记录曝光、点击、订单和退款原因", "有提升才保留；无提升恢复上一版本"],
  ];

  const impressions = n(traffic.impressions);
  const clicks = n(traffic.clicks);
  const carts = n(traffic.carts);
  const orders = n(traffic.orders);
  const spend = n(traffic.spend);
  const ctr = impressions ? clicks / impressions * 100 : 0;
  const cartRate = clicks ? carts / clicks * 100 : 0;
  const orderRate = clicks ? orders / clicks * 100 : 0;
  const cac = orders ? spend / orders : 0;
  const keywordIdeas = [
    [product.category, product.material, product.spec, product.count].filter(Boolean).join(" "),
    [product.category, product.audience, product.scene].filter(Boolean).join(" "),
    [product.category, product.pain || guide.questions[0], product.count].filter(Boolean).join(" "),
  ].filter((item, index, all) => item && all.indexOf(item) === index);
  const trafficDiagnosis = (() => {
    if (traffic.indexed === "no") return { level: "阻断", title: "先解决搜索收录", detail: "用完整商品标题在平台搜索；若仍找不到，优先检查类目、属性、违规词和商品状态，暂时不要继续改主图。", action: "修复类目与属性后，24小时后再次检查收录" };
    if (!impressions) return { level: "待采样", title: "还不能判断是标题还是主图", detail: "没有真实曝光时，点击率为零没有诊断意义。先用3个精确长尾词获取第一批可测曝光。", action: "每个词只投一个小测试单元，先获得真实曝光" };
    if (impressions < 100) return { level: "样本不足", title: "已经有曝光，但样本还太少", detail: `当前 ${impressions} 次曝光不足以稳定判断。先保持标题、主图和价格不变，继续积累样本。`, action: "累计到至少100次实验曝光再判断点击表现" };
    if (!clicks || ctr < 1) return { level: "点击阻塞", title: "用户看到了，但没有被主图和标题说服", detail: `当前实验点击率 ${ctr.toFixed(2)}%。优先重做首图的信息层级，并把真实规格和数量前移。`, action: "只替换主图，保持关键词、价格和SKU不变" };
    if (clicks >= 10 && !carts) return { level: "兴趣阻塞", title: "有人点击，但购买理由不够清楚", detail: `已有 ${clicks} 次点击但没有加购。重点核对尺寸、抽数、包数、每包单价和消费者最担心的问题。`, action: "只补一张规格对比图或修改SKU表达" };
    if (carts && !orders) return { level: "成交阻塞", title: "用户有兴趣，但在付款前犹豫", detail: `已有 ${carts} 次加购但没有成交。优先检查到手价、运费、评价基础、发货承诺和售后说明。`, action: "只测试到手价或售后承诺其中一项" };
    return { level: "可放大", title: "漏斗已经产生真实成交信号", detail: `实验点击率 ${ctr.toFixed(2)}%，点击成交率 ${orderRate.toFixed(2)}%${orders ? `，获客成本 ${money(cac)}` : ""}。`, action: margin > 0 && cac > margin ? "获客成本高于单笔空间，先降成本再放量" : "保留当前赢家，小幅扩大同一流量入口" };
  })();

  function generatePackage() {
    if (!ready) return flash("请先选择平台，并填写规格、数量和售价");
    setGenerated(true);
    setView("audit");
    flash("已基于真实商品字段生成上架方案");
  }

  const nav: { id: View; no: string; label: string }[] = [
    { id: "create", no: "01", label: "创建商品" },
    { id: "audit", no: "02", label: "发布检查" },
    { id: "package", no: "03", label: "引流上架指导" },
    { id: "launch", no: "04", label: "7天流量实验" },
    { id: "diagnose", no: "05", label: "真实流量诊断" },
  ];

  return <div className="product-shell listing-shell">
    {notice && <div className="toast">✓ {notice}</div>}
    <aside className="side-nav listing-nav">
      <div className="logo"><span>增</span><div><strong>AI上新增长代理</strong><small>让每次上架都有依据</small></div></div>
      <nav aria-label="主导航">{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><i>{item.no}</i>{item.label}</button>)}</nav>
      <div className="nav-note"><span>不承诺平台扶持</span><p>优化获得曝光、点击与成交的条件；所有未知数据明确标注，不生成虚构流量。</p></div>
      <div className="operator"><div>本</div><span><strong>当前设备保存</strong><small>清除浏览器数据后会丢失</small></span></div>
    </aside>

    <main className="workspace listing-workspace">
      <header className="topbar"><div><span>商品增长工作台 / {product.category}</span><h1>{nav.find((item) => item.id === view)?.label}</h1></div><div className="top-actions"><span className={generated ? "real-tag" : "waiting-tag"}>{generated ? "上架方案已生成" : "等待商品事实"}</span></div></header>

      {view === "create" && <>
        <section className="listing-hero">
          <div><span>AI LISTING GROWTH AGENT</span><h2>先把商品做成<br/>值得平台分发的样子</h2><p>粘贴链接或手动填写真实规格。系统生成完整上架包、发布检查和7天冷启动实验。</p></div>
          <div className="link-capture"><label>已有商品链接（选填）<div><input value={product.url} onChange={(e) => update("url", e.target.value)} placeholder="淘宝、天猫或拼多多商品链接"/><button onClick={inspectLink} disabled={inspecting}>{inspecting ? "读取中…" : "读取公开信息"}</button></div></label>{inspect && <p className={inspect.status === "captured" ? "ok" : "warn"}>{inspect.message}</p>}</div>
        </section>
        <section className="facts-layout">
          <article className="panel listing-facts"><div className="panel-head"><div><span>真实商品事实</span><h3>不知道的字段可以留空，但不能猜</h3></div><b>{knownFacts}/7 已知</b></div>
            <div className="listing-fields">
              <label>首发平台<select value={product.platform} onChange={(e) => update("platform", e.target.value)}><option value="">请选择</option><option>淘宝</option><option>天猫</option><option>拼多多</option><option>抖店</option><option>其他平台</option></select></label>
              <label>商品类目<select value={product.category} onChange={(e) => update("category", e.target.value as Category)}><option>抽纸</option><option>成人尿片</option><option>其他日用品</option></select></label>
              <label>品牌<input value={product.brand} onChange={(e) => update("brand", e.target.value)} placeholder="没有品牌可留空"/></label>
              <label>材质/原料<input value={product.material} onChange={(e) => update("material", e.target.value)} placeholder={product.category === "抽纸" ? "如：原生木浆" : "包装上的真实描述"}/></label>
              <label>规格/尺码 *<input value={product.spec} onChange={(e) => update("spec", e.target.value)} placeholder={product.category === "抽纸" ? "如：180×130mm 3层" : "如：XL 腰围100-140cm"}/></label>
              <label>数量 *<input value={product.count} onChange={(e) => update("count", e.target.value)} placeholder={product.category === "抽纸" ? "如：24包×100抽" : "如：10片/包"}/></label>
              <label>目标消费者<select value={product.audience} onChange={(e) => update("audience", e.target.value)}>{guide.audience.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>主要场景<input value={product.scene} onChange={(e) => update("scene", e.target.value)} placeholder="如：家庭囤货、老人夜间护理"/></label>
              <label>售价 *<input type="number" min="0" value={product.price} onChange={(e) => update("price", e.target.value)} placeholder="元"/></label>
              <label>进货成本<input type="number" min="0" value={product.cost} onChange={(e) => update("cost", e.target.value)} placeholder="元"/></label>
              <label>运费和包装<input type="number" min="0" value={product.shipping} onChange={(e) => update("shipping", e.target.value)} placeholder="元"/></label>
              <label>平台费率<input type="number" min="0" max="50" step="0.1" value={product.feeRate} onChange={(e) => update("feeRate", e.target.value)} placeholder="不知道可留空 %"/></label>
              <label>目标推广成本/单<input type="number" min="0" step="0.1" value={product.adCost} onChange={(e) => update("adCost", e.target.value)} placeholder="不投放填0 元"/></label>
              <label>目标净利润/单<input type="number" min="0" step="0.1" value={product.targetProfit} onChange={(e) => update("targetProfit", e.target.value)} placeholder="希望每单赚多少"/></label>
              <label>每多1组增加运费<input type="number" min="0" step="0.1" value={product.extraShipping} onChange={(e) => update("extraShipping", e.target.value)} placeholder="组合装增量运费"/></label>
              <label>检测或功效证明<input value={product.proof} onChange={(e) => update("proof", e.target.value)} placeholder="没有就留空"/></label>
              <label className="wide">消费者最担心什么？<input value={product.pain} onChange={(e) => update("pain", e.target.value)} placeholder={product.category === "抽纸" ? "如：尺寸太小、掉屑、实际包数不符" : "如：尺码选错、夜间侧漏、退换不方便"}/></label>
            </div>
            <button className="generate-button" onClick={generatePackage}>生成上架增长方案</button>
          </article>
          <aside className="panel evidence-card"><span>信息来源</span><h3>每条结论都标明依据</h3><div><b>卖家确认</b><p>规格、成本、材质、检测证明</p></div><div><b>链接公开字段</b><p>{inspect?.status === "captured" ? "已读取，仍需人工核对" : "平台可能限制读取，不视为缺陷"}</p></div><div><b>AI策略建议</b><p>标题结构、图片顺序、SKU和实验动作</p></div><small>不会把AI建议伪装成真实销量、搜索量或平台规则。</small></aside>
        </section>
      </>}

      {view === "audit" && <>
        <section className="audit-hero"><div><span>发布准备度，不是流量预测</span><strong>{preparation}</strong><i>/100</i><p>只衡量当前商品资料是否具备发布和测试条件。</p></div><div><h2>{preparation >= 80 ? "可以进入小范围发布测试" : "先修复未通过项，再争取流量"}</h2><p>平台是否分发仍取决于竞争环境、店铺服务和真实消费者反馈。</p><button onClick={() => setView("package")}>查看引流上架指导</button></div></section>
        <section className="panel audit-list"><div className="panel-head"><div><span>逐项检查</span><h3>没有证据的项目不会给高分</h3></div><b>{checks.filter((item) => item.pass).length}/{checks.length} 通过</b></div>{checks.map((item) => <article key={item.label} className={item.pass ? "pass" : "fail"}><i>{item.pass ? "✓" : "!"}</i><div><h3>{item.label}</h3><p>{item.detail}</p></div><span>{item.pass ? "已通过" : "需要处理"}</span></article>)}</section>
        <section className="risk-grid"><article className="panel"><span>合规风险</span><ul>{guide.risks.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="panel"><span>优先修复顺序</span><ol>{checks.filter((item) => !item.pass).map((item) => <li key={item.label}>{item.label}：{item.detail}</li>)}</ol>{checks.every((item) => item.pass) && <p>基础条件已齐，下一步用真实曝光和订单验证。</p>}</article></section>
      </>}

      {view === "package" && <>
        <section className="package-intro"><div><span>基于卖家真实成本的上架指导</span><h2>{product.category} · {product.platform || "待选择平台"}</h2><p>标题、关键词、组合与价格均来自你填写的商品事实和成本目标；建议价是测试起点，不是平台最优价保证。</p></div><button onClick={() => navigator.clipboard.writeText(titles[0] || "").then(() => flash("主标题已复制"))} disabled={!titles[0]}>复制主标题</button></section>
        <section className="package-grid">
          <article className="panel title-options"><span>标题方案</span>{titles.length ? titles.map((title, index) => <div key={title}><b>方案 {String.fromCharCode(65 + index)}</b><p>{title}</p></div>) : <p>先在“创建商品”补齐规格、数量和场景。</p>}<small>建议首发方案A；后续只替换一个标题变量。</small></article>
          <article className="panel keyword-plan"><span>搜索意图覆盖</span><div>{keywordIdeas.map((word) => <b key={word}>{word}</b>)}</div><p>根据品类、规格、人群、场景和顾虑组合；不代表平台真实搜索量，发布前需在平台搜索框核对联想词。</p></article>
        </section>
        <section className="pricing-guide">
          <article className="panel price-health"><span>当前单件账</span><h3>{n(product.price) ? money(currentContribution) : "待填写售价"}</h3><p>售价扣除进货、运费、平台费和目标推广成本后的单笔余量。</p><div className={currentContribution >= pricingProfitTarget && currentContribution > 0 ? "healthy" : "risk"}>{!n(product.cost) ? "缺少进货成本，不能指导定价" : currentContribution <= 0 ? "当前售价可能亏损" : currentContribution < pricingProfitTarget ? `低于目标利润 ${money(pricingProfitTarget)}` : "达到当前目标利润"}</div></article>
          <article className="panel price-formula"><span>计算依据</span><h3>保本与目标价透明计算</h3><p>建议底价 =（商品成本＋履约运费＋目标推广成本＋目标利润）÷（1－平台费率）</p><ul><li>平台费率：{product.feeRate ? `${product.feeRate}%` : "未填写，暂按0计算"}</li><li>目标推广成本：{product.adCost ? money(targetAdCost) : "未填写，暂按0计算"}</li><li>目标净利润：{product.targetProfit ? money(targetProfit) : `${money(pricingProfitTarget)}（沿用当前余量）`}</li><li>组合装增量运费：{product.extraShipping ? `${money(extraShipping)} / 多1组` : "未填写，组合价可能偏低"}</li></ul></article>
        </section>
        <section className="panel image-plan"><div className="panel-head"><div><span>五张商品图结构</span><h3>每张图只解决一个购买问题</h3></div></div><div>{guide.images.map((item, index) => <article key={item}><b>0{index + 1}</b><p>{item}</p></article>)}</div></section>
        <section className="sku-and-qa"><article className="panel"><span>组合与建议测试价</span><div className="sku-cards">{pricePlans.length ? pricePlans.map((item) => <div key={item.type}><b>{item.type} · {item.quantity}组</b><strong>{money(item.testPrice)}</strong><small>目标底价 {money(item.floor)} · 每组 {money(item.unitPrice)}</small><p>{item.role}</p></div>) : <p>填写进货成本后生成组合定价。</p>}</div></article><article className="panel"><span>详情页必须回答</span><ol>{guide.questions.map((item) => <li key={item}>{item}</li>)}</ol></article></section>
      </>}

      {view === "launch" && <>
        <section className="launch-head"><div><span>冷启动不是等平台扶持</span><h2>7天只验证一个变量</h2><p>先获得第一批真实曝光、点击和订单，再决定是否追加投入。</p></div><strong>{done.length}/7</strong></section>
        <section className="panel experiment-list">{launchPlan.map((item, index) => <article key={item[0]} className={done.includes(index) ? "done" : ""}><button onClick={() => setDone((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}>{done.includes(index) ? "✓" : index + 1}</button><div><span>DAY {index + 1} · {item[0]}</span><h3>{item[1]}</h3><p>{item[2]}</p></div></article>)}</section>
        <section className="launch-rules"><article><span>继续条件</span><strong>曝光、点击或订单至少一项改善</strong><p>保留有效变量，小幅扩大。</p></article><article><span>停止条件</span><strong>{margin > 0 ? `单轮花费达到 ${money(margin)} 仍无订单` : "利润边界不清楚"}</strong><p>停止追加，不用总预算追亏损。</p></article><article><span>真实归因</span><strong>一轮只改一个变量</strong><p>否则无法知道增长来自哪里。</p></article></section>
      </>}

      {view === "diagnose" && <>
        <section className="diagnose-hero">
          <div><span>REAL FUNNEL DIAGNOSIS</span><h2>先定位流量卡在哪一层</h2><p>只填写商家后台真实看到的数据。工具不猜搜索量、不伪造排名，也不把通用阈值说成平台规则。</p></div>
          <div className="diagnosis-result"><b>{trafficDiagnosis.level}</b><h3>{trafficDiagnosis.title}</h3><p>{trafficDiagnosis.detail}</p><strong>下一步：{trafficDiagnosis.action}</strong></div>
        </section>

        <section className="diagnose-layout">
          <article className="panel funnel-input"><div className="panel-head"><div><span>真实数据输入</span><h3>建议填写同一商品、同一轮测试的累计数据</h3></div><b>本机保存</b></div>
            <div className="funnel-fields">
              <label>完整标题能否搜到<select value={traffic.indexed} onChange={(e) => setTraffic((current) => ({ ...current, indexed: e.target.value as Traffic["indexed"] }))}><option value="unknown">还没检查</option><option value="yes">可以搜到</option><option value="no">完全搜不到</option></select></label>
              <label>曝光次数<input type="number" min="0" value={traffic.impressions} onChange={(e) => setTraffic((current) => ({ ...current, impressions: e.target.value }))} placeholder="商家后台数据"/></label>
              <label>点击次数<input type="number" min="0" value={traffic.clicks} onChange={(e) => setTraffic((current) => ({ ...current, clicks: e.target.value }))} placeholder="商品点击"/></label>
              <label>收藏/加购<input type="number" min="0" value={traffic.carts} onChange={(e) => setTraffic((current) => ({ ...current, carts: e.target.value }))} placeholder="合计也可以"/></label>
              <label>支付订单<input type="number" min="0" value={traffic.orders} onChange={(e) => setTraffic((current) => ({ ...current, orders: e.target.value }))} placeholder="真实支付订单"/></label>
              <label>本轮花费<input type="number" min="0" value={traffic.spend} onChange={(e) => setTraffic((current) => ({ ...current, spend: e.target.value }))} placeholder="没有付费填0"/></label>
            </div>
            <small>诊断阈值仅用于这一轮实验决策，不代表淘宝、拼多多、抖店等平台的官方标准。</small>
          </article>

          <aside className="panel funnel-summary"><span>漏斗结果</span><div><small>曝光 → 点击</small><strong>{impressions ? `${ctr.toFixed(2)}%` : "待数据"}</strong></div><div><small>点击 → 加购</small><strong>{clicks ? `${cartRate.toFixed(2)}%` : "待数据"}</strong></div><div><small>点击 → 成交</small><strong>{clicks ? `${orderRate.toFixed(2)}%` : "待数据"}</strong></div><div><small>单笔获客成本</small><strong>{orders ? money(cac) : "待订单"}</strong></div></aside>
        </section>

        <section className="keyword-lab">
          <article className="panel keyword-experiments"><div className="panel-head"><div><span>冷启动关键词</span><h3>先用精确长尾词获得第一批可诊断曝光</h3></div><button onClick={() => navigator.clipboard.writeText(keywordIdeas.join("\n")).then(() => flash("关键词已复制"))}>复制全部</button></div>
            <div>{keywordIdeas.map((word, index) => <article key={word}><i>0{index + 1}</i><div><b>{index === 0 ? "商品规格词" : index === 1 ? "人群场景词" : "顾虑解决词"}</b><p>{word}</p></div></article>)}</div>
            {!generated && <small>先在“创建商品”填写真实规格并生成方案，关键词才会更准确。</small>}
          </article>
          <article className="panel one-variable"><span>一次只改一个变量</span><h3>推荐测试顺序</h3><ol><li>先确认完整标题可以搜到</li><li>固定价格和SKU，测试一个关键词入口</li><li>有曝光没点击，只换主图</li><li>有点击没加购，只补规格与购买理由</li><li>有加购没成交，只测价格或信任承诺</li></ol><p>每轮记录开始时间和结束时间，避免把自然波动误判成优化效果。</p></article>
        </section>
      </>}

      <footer><span>工具优化商品获得流量与成交的条件，不保证平台分发或销售结果。</span><span>当前方案保存在本设备；商品事实与功效必须由卖家核对。</span></footer>
    </main>
  </div>;
}
