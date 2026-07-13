"use client";

import { useMemo, useState } from "react";

type View = "today" | "product" | "calculator" | "review";
type ProductInspection = { platform?: string; productId?: string; title?: string; image?: string; price?: string; publishedAt?: string; salesVolume?: number | null; salesPeriod?: "cumulative" | "monthly" | "unknown"; status?: "captured" | "partial"; message?: string; error?: string };
type Task = { tag: string; title: string; why: string; action: string; stop: string };

const num = (value: string | number) => Math.max(0, Number(value) || 0);
const money = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value);
const format = (value: number) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(value);
const rate = (top: number, bottom: number) => bottom ? top / bottom * 100 : 0;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function daysSince(date: string) {
  if (!date) return 0;
  const start = new Date(`${date}T00:00:00`);
  const now = new Date();
  return Number.isNaN(start.getTime()) || start > now ? 0 : Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
}

export default function Home() {
  const [view, setView] = useState<View>("today");
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState<number[]>([]);
  const [shop, setShop] = useState({ platform: "淘宝", price: "99", cost: "42", shipping: "8", feeRate: "5", refundRate: "8", visitors: "1200", orders: "18", adSpend: "800", target: "50000" });
  const [previous, setPrevious] = useState({ visitors: "980", orders: "12", revenue: "1188", adSpend: "620" });
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [product, setProduct] = useState<ProductInspection | null>(null);
  const [publishedAt, setPublishedAt] = useState("");
  const [salesVolume, setSalesVolume] = useState("");
  const [salesPeriod, setSalesPeriod] = useState<"cumulative" | "monthly">("cumulative");
  const [loading, setLoading] = useState(false);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function updateShop(key: keyof typeof shop, value: string) {
    setShop((current) => ({ ...current, [key]: value }));
  }

  const business = useMemo(() => {
    const price = num(shop.price);
    const cost = num(shop.cost);
    const shipping = num(shop.shipping);
    const feeRate = num(shop.feeRate) / 100;
    const refundRate = num(shop.refundRate) / 100;
    const visitors = num(shop.visitors);
    const orders = num(shop.orders);
    const adSpend = num(shop.adSpend);
    const target = num(shop.target);
    const grossRevenue = price * orders;
    const validOrders = orders * (1 - refundRate);
    const netRevenue = price * validOrders;
    const contribution = price * (1 - feeRate) - cost - shipping;
    const maxCac = Math.max(0, contribution * (1 - refundRate));
    const conversion = rate(orders, visitors);
    const maxCpc = maxCac * conversion / 100;
    const breakEvenRoas = maxCac ? price / maxCac : 0;
    const actualRoas = adSpend ? grossRevenue / adSpend : 0;
    const profit = validOrders * contribution - adSpend;
    const monthlyProjection = netRevenue / 7 * 30;
    const targetGap = Math.max(0, target - monthlyProjection);
    const requiredOrders = price ? Math.ceil(targetGap / price) : 0;
    const requiredVisitors = conversion ? Math.ceil(requiredOrders / (conversion / 100)) : 0;

    const tasks: Task[] = [];
    if (contribution <= 0) tasks.push({ tag: "先止损", title: "当前商品没有可用于推广的毛利", why: `每单贡献毛利约 ${money(contribution)}，继续买流量会放大亏损。`, action: "先调整售价、采购成本、运费或组合规格，确保单笔订单在广告前有正毛利。", stop: "毛利未转正前，不启动付费推广。" });
    else if (actualRoas && actualRoas < breakEvenRoas) tasks.push({ tag: "P0 投放", title: "暂停低于保本线的广告组", why: `当前投产约 ${actualRoas.toFixed(2)}，低于保本投产 ${breakEvenRoas.toFixed(2)}。`, action: "按关键词或素材拆分广告，关闭连续花费达到一个保本获客成本仍无成交的单元。", stop: `单个测试花费达到 ${money(maxCac)} 仍无订单就停止。` });
    else tasks.push({ tag: "P0 获客", title: "只放大已经接近盈利的流量", why: `当前投产约 ${actualRoas.toFixed(2)}，保本线约 ${breakEvenRoas.toFixed(2)}。`, action: "将预算集中到有成交的搜索词或素材，每次只增加20%，观察2天。", stop: `投产跌破 ${breakEvenRoas.toFixed(2)} 时停止加预算。` });
    if (conversion < 2) tasks.push({ tag: "P0 转化", title: "先改主图与购买理由，再扩大流量", why: `近7天支付转化率约 ${conversion.toFixed(2)}%，流量进入后成交偏弱。`, action: "首图只突出一个核心利益点；详情首屏补齐规格、适用人群、发货和售后承诺。", stop: "至少积累100个新访客后再判断，不要同时修改价格。" });
    else tasks.push({ tag: "P1 转化", title: "保留当前承接，测试一个新主图", why: `近7天转化率约 ${conversion.toFixed(2)}%，已有基础成交能力。`, action: "复制当前主图做B版，只替换一个卖点，保持价格和流量来源一致。", stop: "每版至少获得1,000次曝光或100个访客。" });
    tasks.push({ tag: "P1 目标", title: targetGap ? `补足月目标还需约 ${requiredOrders} 单` : "当前速度已经覆盖月度目标", why: targetGap ? `按当前速度，月营业额预计 ${money(monthlyProjection)}，距离目标还差 ${money(targetGap)}。` : `按当前速度，月营业额预计 ${money(monthlyProjection)}。`, action: targetGap ? `先把转化保持在 ${conversion.toFixed(2)}%，再争取新增约 ${format(requiredVisitors)} 个精准访客。` : "保持有效渠道，每周复盘退款率和真实利润，避免只追营业额。", stop: "新增流量的获客成本不得超过保本获客成本。" });
    return { price, visitors, orders, adSpend, grossRevenue, netRevenue, contribution, maxCac, conversion, maxCpc, breakEvenRoas, actualRoas, profit, monthlyProjection, targetGap, tasks: tasks.slice(0, 3) };
  }, [shop]);

  const review = useMemo(() => {
    const previousVisitors = num(previous.visitors);
    const previousOrders = num(previous.orders);
    const previousRevenue = num(previous.revenue);
    const previousSpend = num(previous.adSpend);
    const currentRevenue = business.grossRevenue;
    const revenueChange = rate(currentRevenue - previousRevenue, previousRevenue);
    const visitorChange = rate(business.visitors - previousVisitors, previousVisitors);
    const currentConversion = business.conversion;
    const previousConversion = rate(previousOrders, previousVisitors);
    const conversionChange = currentConversion - previousConversion;
    const spendChange = rate(business.adSpend - previousSpend, previousSpend);
    let conclusion = "营业额基本稳定";
    let reason = "访客和转化变化都不大，下一步应进行单变量测试。";
    if (revenueChange > 5 && visitorChange > 5 && conversionChange >= 0) { conclusion = "营业额增长质量较好"; reason = "访客增加，同时转化没有下降，说明新增流量与商品承接基本匹配。"; }
    else if (revenueChange > 5 && spendChange > revenueChange) { conclusion = "营业额增长，但推广效率变差"; reason = "广告花费的增长快于营业额，需要检查新增预算是否带来低质量流量。"; }
    else if (revenueChange < -5 && visitorChange < -5) { conclusion = "主要问题是客流下降"; reason = "访客下降幅度明显，优先排查搜索排名、广告停投、活动结束或商品状态。"; }
    else if (revenueChange < -5 && conversionChange < 0) { conclusion = "主要问题是转化下降"; reason = "访客没有同步大跌，但成交效率变差，应检查价格、主图、评价与详情承接。"; }
    return { revenueChange, visitorChange, conversionChange, spendChange, conclusion, reason, previousConversion };
  }, [business, previous]);

  const productReport = useMemo(() => {
    const listingDays = daysSince(publishedAt);
    const sales = num(salesVolume);
    const dailySales = salesPeriod === "monthly" ? sales / 30 : listingDays ? sales / listingDays : 0;
    const keywordHit = Boolean(keyword.trim() && product?.title?.includes(keyword.trim()));
    const score = clamp(Math.round(Math.log10(dailySales + 1) * 35 + Math.log10(sales + 1) * 9 + (keywordHit ? 20 : 8)));
    const stage = !listingDays || !sales ? "等待数据" : listingDays <= 45 && dailySales >= 10 ? "新品快速起量" : listingDays >= 180 && dailySales < 3 ? "老链接动能衰减" : dailySales >= 5 ? "增长中的链接" : "低动能链接";
    return { listingDays, sales, dailySales, score, stage, keywordHit };
  }, [keyword, product, publishedAt, salesPeriod, salesVolume]);

  async function inspectProduct() {
    if (!url.trim()) return flash("请先粘贴商品链接");
    setLoading(true);
    try {
      const response = await fetch("/api/inspect-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const result = await response.json() as ProductInspection;
      if (!response.ok) throw new Error(result.error || "链接读取失败");
      setProduct(result);
      setPublishedAt(result.publishedAt || "");
      setSalesVolume(result.salesVolume === null || result.salesVolume === undefined ? "" : String(result.salesVolume));
      setSalesPeriod(result.salesPeriod === "monthly" ? "monthly" : "cumulative");
      flash(result.status === "captured" ? "已读取公开字段，请核对" : "链接已识别，请补充缺失字段");
    } catch (error) {
      const message = error instanceof Error ? error.message : "链接读取失败";
      setProduct({ error: message });
      flash(message);
    } finally { setLoading(false); }
  }

  const labels: Record<View, [string, string]> = { today: ["营业额增长", "今日经营任务"], product: ["商品增长", "商品竞争力诊断"], calculator: ["推广决策", "保本投放计算器"], review: ["经营复盘", "营业额变化原因"] };

  return <div className="product-shell">
    {notice && <div className="toast">✓ {notice}</div>}
    <aside className="side-nav">
      <div className="logo"><span>增</span><div><strong>营业额助手</strong><small>新手经营工作台</small></div></div>
      <nav aria-label="主导航">
        {(["today", "product", "calculator", "review"] as View[]).map((item, index) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}><i>0{index + 1}</i>{labels[item][1]}</button>)}
      </nav>
      <div className="nav-note"><span>今天只做三件事</span><p>先看利润，再找瓶颈；每次只改一个变量，用数据决定继续还是停止。</p></div>
      <div className="operator"><div>GH</div><span><strong>新手店主</strong><small>{shop.platform} · 近7天经营</small></span></div>
    </aside>

    <main className="workspace growth-workspace">
      <header className="topbar"><div><span>{labels[view][0]} / 近7天</span><h1>{labels[view][1]}</h1></div><div className="top-actions"><span className={business.profit >= 0 ? "real-tag" : "danger-tag"}>{business.profit >= 0 ? `预计利润 ${money(business.profit)}` : `预计亏损 ${money(Math.abs(business.profit))}`}</span></div></header>

      {view === "today" && <>
        <section className="growth-hero">
          <div><span>本月营业额预测</span><strong>{money(business.monthlyProjection)}</strong><p>{business.targetGap ? `距离 ${money(num(shop.target))} 目标还差 ${money(business.targetGap)}` : "按当前速度已达到月度目标，下一步守住利润。"}</p></div>
          <div className="hero-form"><label>经营平台<select value={shop.platform} onChange={(e) => updateShop("platform", e.target.value)}><option>淘宝</option><option>天猫</option><option>拼多多</option><option>抖店</option></select></label><label>月营业额目标<input type="number" value={shop.target} onChange={(e) => updateShop("target", e.target.value)}/></label><button onClick={() => flash("已按最新数据重新生成今日任务")}>重新生成任务</button></div>
        </section>
        <section className="metrics-grid growth-metrics">
          <article><div><span>近7天营业额</span><em>售价×订单</em></div><strong>{money(business.grossRevenue)}</strong><small>退款前支付口径</small></article>
          <article><div><span>访客</span><em>需要精准流量</em></div><strong>{format(business.visitors)}</strong><small>用于计算支付转化</small></article>
          <article className="focus"><div><span>支付转化率</span><em className={business.conversion >= 2 ? "up" : "down"}>{business.conversion >= 2 ? "有基础" : "先优化"}</em></div><strong>{business.conversion.toFixed(2)}%</strong><small>{format(business.orders)}单 ÷ {format(business.visitors)}访客</small></article>
          <article><div><span>广告投产</span><em>保本 {business.breakEvenRoas.toFixed(2)}</em></div><strong>{business.actualRoas.toFixed(2)}</strong><small>{business.actualRoas >= business.breakEvenRoas ? "高于保本线" : "低于保本线"}</small></article>
        </section>
        <section className="panel task-board"><div className="panel-head"><div><span>行动优先级</span><h3>今天只处理这三件事</h3></div><b>{done.length}/3 已完成</b></div><div className="task-list">{business.tasks.map((task, index) => <article key={task.title} className={done.includes(index) ? "done" : ""}><button aria-label={`完成${task.title}`} onClick={() => setDone((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}>{done.includes(index) ? "✓" : index + 1}</button><div><span>{task.tag}</span><h3>{task.title}</h3><p>{task.why}</p><strong>怎么做：{task.action}</strong><small>停止/验证标准：{task.stop}</small></div></article>)}</div></section>
      </>}

      {view === "calculator" && <>
        <section className="calculator-layout">
          <article className="panel input-card"><span>填写真实经营数据</span><h2>先算清楚一单能赚多少</h2><div className="business-fields">
            {([["price", "商品售价（元）"], ["cost", "商品成本（元）"], ["shipping", "运费/包装（元）"], ["feeRate", "平台扣点（%）"], ["refundRate", "退款率（%）"], ["visitors", "近7天访客"], ["orders", "近7天订单"], ["adSpend", "近7天广告花费（元）"]] as [keyof typeof shop, string][]).map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" value={shop[key]} onChange={(e) => updateShop(key, e.target.value)}/></label>)}
          </div></article>
          <div className="calculator-results">
            <article className={`result-hero ${business.contribution <= 0 ? "loss" : ""}`}><span>每单广告前贡献毛利</span><strong>{money(business.contribution)}</strong><p>{business.contribution > 0 ? "这是支付平台费用、商品成本和运费后，可用于承担退款与获客的空间。" : "当前售价不足以覆盖商品成本、运费和平台费用。"}</p></article>
            <div className="result-grid"><article><span>保本获客成本</span><strong>{money(business.maxCac)}</strong><small>获得一个订单最多可花</small></article><article><span>保本投产比</span><strong>{business.breakEvenRoas.toFixed(2)}</strong><small>广告投产低于它会亏损</small></article><article><span>保本点击成本</span><strong>{money(business.maxCpc)}</strong><small>按当前转化率估算</small></article><article><span>近7天预计利润</span><strong className={business.profit >= 0 ? "up" : "down"}>{money(business.profit)}</strong><small>扣除退款影响与广告花费</small></article></div>
            <article className="panel stop-rule"><span>新手止损规则</span><h3>先用小预算验证，再决定是否放大</h3><p>单个关键词或素材累计花费达到 <b>{money(business.maxCac)}</b> 仍无订单，先暂停；广告投产连续两天低于 <b>{business.breakEvenRoas.toFixed(2)}</b>，不要加预算。</p></article>
          </div>
        </section>
      </>}

      {view === "review" && <>
        <section className="review-layout">
          <article className="panel input-card"><span>上一个7天</span><h2>输入对比周期数据</h2><div className="business-fields review-fields">{([["visitors", "访客"], ["orders", "订单"], ["revenue", "营业额"], ["adSpend", "广告花费"]] as [keyof typeof previous, string][]).map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" value={previous[key]} onChange={(e) => setPrevious((current) => ({ ...current, [key]: e.target.value }))}/></label>)}</div><small>当前周期使用推广计算器中的近7天数据。</small></article>
          <article className="panel review-conclusion"><span>复盘结论</span><h2>{review.conclusion}</h2><p>{review.reason}</p><div className="change-list"><div><span>营业额变化</span><b className={review.revenueChange >= 0 ? "up" : "down"}>{review.revenueChange >= 0 ? "+" : ""}{review.revenueChange.toFixed(1)}%</b></div><div><span>访客变化</span><b className={review.visitorChange >= 0 ? "up" : "down"}>{review.visitorChange >= 0 ? "+" : ""}{review.visitorChange.toFixed(1)}%</b></div><div><span>转化率变化</span><b className={review.conversionChange >= 0 ? "up" : "down"}>{review.conversionChange >= 0 ? "+" : ""}{review.conversionChange.toFixed(2)}个百分点</b></div><div><span>广告花费变化</span><b>{review.spendChange >= 0 ? "+" : ""}{review.spendChange.toFixed(1)}%</b></div></div></article>
        </section>
        <section className="panel review-action"><div><span>下周期只验证一个变量</span><h3>{review.visitorChange < -5 ? "恢复一个已验证的精准流量入口" : review.conversionChange < 0 ? "只测试一张新主图" : "小幅放大当前有效渠道"}</h3></div><p>{review.visitorChange < -5 ? "检查流量下降来源，优先恢复曾经有成交的搜索词或内容。" : review.conversionChange < 0 ? "保持价格、流量和详情不变，只替换主图，积累足够访客后比较。" : "预算每次增加20%，连续观察两天的投产和退款。"}</p></section>
      </>}

      {view === "product" && <>
        <section className="product-entry compact-entry"><div className="entry-copy"><span className="eyebrow">PRODUCT DIAGNOSIS</span><h2>判断商品为什么有客流，差链接如何改</h2><p>从发布时间、销量速度、标题搜索词和页面公开信息推断竞争力。</p></div><div className="entry-form link-form"><label><span>商品链接</span><div><input value={url} onChange={(e) => { setUrl(e.target.value); setProduct(null); }} placeholder="粘贴淘宝、天猫或拼多多链接"/><button disabled={loading} onClick={inspectProduct}>{loading ? "读取中" : "识别"}</button></div></label><label><span>核心搜索词</span><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="例如：婴儿柔纸巾"/></label></div></section>
        {product && <section className={`product-result ${product.error ? "error" : ""}`}>{product.image ? <img src={product.image} alt="商品主图"/> : <div className="product-placeholder">{product.platform?.slice(0, 1) || "链"}</div>}<div><span>{product.platform || "商品"}{product.productId ? ` · ID ${product.productId}` : ""}</span><h3>{product.title || (product.error ? "读取失败" : "链接已识别")}</h3><p>{product.error || product.message}</p></div><b>{product.status === "captured" ? "已读取" : "请补充"}</b></section>}
        <section className="evidence-panel panel"><div className="panel-head"><div><span>公开证据</span><h3>核对发布时间和销量</h3></div><small>平台未公开时可手动填写，不会猜测</small></div><div className="evidence-fields"><label><span>发布时间</span><input type="date" value={publishedAt} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPublishedAt(e.target.value)}/><small>{publishedAt ? `距今 ${productReport.listingDays} 天` : "等待填写"}</small></label><label><span>公开销量</span><input type="number" value={salesVolume} onChange={(e) => setSalesVolume(e.target.value)} placeholder="例如：1280"/><small>使用页面显示数字</small></label><label><span>销量口径</span><select value={salesPeriod} onChange={(e) => setSalesPeriod(e.target.value as "cumulative" | "monthly")}><option value="cumulative">累计销量</option><option value="monthly">近30天销量</option></select><small>口径影响销售速度</small></label></div></section>
        {publishedAt && salesVolume ? <><section className="metrics-grid momentum-metrics"><article><div><span>上架天数</span><em>{productReport.listingDays <= 45 ? "新品" : "存量链接"}</em></div><strong>{format(productReport.listingDays)}天</strong><small>从发布时间计算</small></article><article className="focus"><div><span>日均销量</span><em>{productReport.dailySales >= 5 ? "较强" : "偏弱"}</em></div><strong>{productReport.dailySales.toFixed(1)}单</strong><small>同类商品横向比较</small></article><article><div><span>竞争阶段</span></div><strong className="text-metric">{productReport.stage}</strong><small>结合上架周期与销售速度</small></article><article><div><span>势能评分</span></div><strong>{productReport.score}/100</strong><small>公开证据推断</small></article></section><section className="diagnosis panel"><div className="diagnosis-title"><div><span>优先建议</span><h3>先修正最可能限制客流的环节</h3></div></div><div className="diagnosis-list"><article><b>P0</b><div><span>搜索入口</span><h4>{productReport.keywordHit ? "标题已覆盖核心词，继续拆分精准长尾词" : "将核心搜索词放入标题前半段"}</h4><p>{keyword ? `围绕“${keyword}”补充人群、场景和规格词，避免无关堆词。` : "先填写一个最接近成交意图的核心搜索词。"}</p></div><em>今天处理</em></article><article><b>P0</b><div><span>点击理由</span><h4>{productReport.dailySales < 3 ? "重做主图的第一购买理由" : "保留有效首图，只做单变量B版"}</h4><p>一张图只表达一个核心利益点，同时明确规格、适用对象和可验证优势。</p></div><em>3天验证</em></article><article><b>P1</b><div><span>竞争校准</span><h4>加入3个同关键词、同价位竞品</h4><p>比较上架天数、日均销量、价格与评价，跨类目不要直接比较绝对销量。</p></div><em>随后处理</em></article></div></section></> : <section className="empty-state panel"><div>诊</div><span>等待分析证据</span><h2>识别链接后，核对发布时间和销量</h2><p>这两个字段用于判断销售形成速度；平台无法公开返回时可以手动填写。</p></section>}
      </>}
      <footer><span>工具帮助你做经营判断，不承诺流量或销量结果。</span><span>所有推广建议都应先小预算验证，并以真实利润作为停止线。</span></footer>
    </main>
  </div>;
}
