"use client";

import { useMemo, useState } from "react";

type ProductInspection = {
  platform?: string;
  productId?: string;
  title?: string;
  description?: string;
  image?: string;
  price?: string;
  publishedAt?: string;
  salesVolume?: number | null;
  salesPeriod?: "cumulative" | "monthly" | "unknown";
  status?: "captured" | "partial";
  message?: string;
  error?: string;
};

type Advice = { priority: "P0" | "P1" | "P2"; title: string; detail: string };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const number = (value: number) => new Intl.NumberFormat("zh-CN").format(Math.round(value));

function daysSince(date: string) {
  if (!date) return 0;
  const start = new Date(`${date}T00:00:00`);
  const now = new Date();
  if (Number.isNaN(start.getTime()) || start > now) return 0;
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [product, setProduct] = useState<ProductInspection | null>(null);
  const [publishedAt, setPublishedAt] = useState("");
  const [salesVolume, setSalesVolume] = useState("");
  const [salesPeriod, setSalesPeriod] = useState<"cumulative" | "monthly">("cumulative");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  async function inspectProduct() {
    if (!url.trim()) return flash("请先粘贴商品链接");
    setLoading(true);
    setProduct(null);
    try {
      const response = await fetch("/api/inspect-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await response.json() as ProductInspection;
      if (!response.ok) throw new Error(result.error || "商品链接读取失败");
      setProduct(result);
      setPublishedAt(result.publishedAt || "");
      setSalesVolume(result.salesVolume === null || result.salesVolume === undefined ? "" : String(result.salesVolume));
      setSalesPeriod(result.salesPeriod === "monthly" ? "monthly" : "cumulative");
      flash(result.status === "captured" ? "已读取公开商品字段，请核对后分析" : "链接已识别，请补充缺失字段");
    } catch (error) {
      const message = error instanceof Error ? error.message : "商品链接读取失败";
      setProduct({ error: message });
      flash(message);
    } finally {
      setLoading(false);
    }
  }

  const report = useMemo(() => {
    const listingDays = daysSince(publishedAt);
    const sales = Math.max(0, Number(salesVolume) || 0);
    const dailySales = salesPeriod === "monthly" ? sales / 30 : listingDays ? sales / listingDays : 0;
    const estimatedMonthly = dailySales * 30;
    const keywordHit = Boolean(keyword.trim() && product?.title?.toLowerCase().includes(keyword.trim().toLowerCase()));
    const titleQuality = product?.title ? clamp(product.title.length >= 18 && product.title.length <= 60 ? 82 : 62, 0, 100) : 35;
    const velocityScore = clamp(Math.round(Math.log10(dailySales + 1) * 34 + Math.log10(sales + 1) * 9), 0, 100);
    const trustScore = clamp(Math.round(Math.log10(sales + 1) * 22), 0, 100);
    const searchScore = clamp(titleQuality + (keywordHit ? 12 : keyword.trim() ? -12 : 0), 0, 100);
    const potentialScore = Math.round(velocityScore * .48 + trustScore * .22 + searchScore * .3);

    let stage = "待补充数据";
    let stageNote = "补充发布时间和销量后，才能判断销量形成速度。";
    if (listingDays && sales) {
      if (listingDays <= 45 && dailySales >= 10) {
        stage = "新品快速起量";
        stageNote = `上架 ${listingDays} 天，日均约 ${dailySales.toFixed(1)} 单，说明首发素材、价格或投放承接可能有效。`;
      } else if (listingDays >= 180 && sales >= 1000) {
        stage = dailySales >= 3 ? "成熟稳定款" : "老链接动能衰减";
        stageNote = dailySales >= 3
          ? `累计销量形成信任资产，目前仍保持日均约 ${dailySales.toFixed(1)} 单。`
          : `历史销量较高，但摊到上架周期后日均仅约 ${dailySales.toFixed(1)} 单，需要刷新搜索入口和点击素材。`;
      } else if (dailySales >= 5) {
        stage = "增长中的链接";
        stageNote = `日均约 ${dailySales.toFixed(1)} 单，已有稳定成交反馈，可继续放大高意图关键词。`;
      } else {
        stage = "低动能链接";
        stageNote = `日均约 ${dailySales.toFixed(1)} 单，当前销量积累速度不足，优先解决搜索匹配和首图点击理由。`;
      }
    }

    const causes: string[] = [];
    if (dailySales >= 10) causes.push("销售速度高，容易形成销量与评价带来的信任反馈");
    else if (dailySales >= 3) causes.push("链接保持稳定成交，具备持续获得流量的基础");
    if (sales >= 1000) causes.push("累计销量较高，历史成交为点击和转化提供信任背书");
    if (keywordHit) causes.push(`标题直接覆盖核心搜索词“${keyword.trim()}”，搜索意图匹配较清晰`);
    if (product?.image) causes.push("平台公开页返回了主图，可继续检查首图的信息表达与差异化");
    if (!causes.length) causes.push("当前公开证据不足，不能断言该链接已有稳定客流");

    const advice: Advice[] = [];
    if (keyword.trim() && !keywordHit) advice.push({ priority: "P0", title: "把核心搜索词放进标题有效位置", detail: `当前标题未完整覆盖“${keyword.trim()}”。优先放在标题前半段，并搭配规格、用途和目标人群，避免无关堆词。` });
    if (!keyword.trim()) advice.push({ priority: "P0", title: "先确定一个核心搜索词", detail: "没有搜索词就无法判断商品是否匹配真实购买意图。选择一个最接近成交场景的词，再评估标题和主图。" });
    if (dailySales < 3) advice.push({ priority: "P0", title: "重做首图的点击理由", detail: "用一张图只表达一个核心利益点：适用对象、关键规格和可验证优势。避免只摆产品而没有购买理由。" });
    if (listingDays > 180 && dailySales < 3) advice.push({ priority: "P1", title: "老链接需要刷新而不是只降价", detail: "更新标题词序、首图卖点和首屏详情，连续观察 7 天；不要同时大改价格、素材和投放，以免无法判断原因。" });
    if (sales < 100) advice.push({ priority: "P1", title: "先建立可见的信任证据", detail: "补齐真实评价中的使用场景、规格对比、发货时效与售后说明，降低第一次购买的不确定性。" });
    advice.push({ priority: "P2", title: "用同关键词竞品校准结论", detail: "再加入 3–5 个同价位竞品，比较上架天数、累计销量与日均销量；绝对销量跨类目不可直接横比。" });

    return { listingDays, sales, dailySales, estimatedMonthly, velocityScore, trustScore, searchScore, potentialScore, stage, stageNote, causes, advice };
  }, [keyword, product, publishedAt, salesPeriod, salesVolume]);

  const ready = Boolean(publishedAt && salesVolume && !product?.error);

  return (
    <div className="product-shell">
      {notice && <div className="toast">✓ {notice}</div>}
      <aside className="side-nav">
        <div className="logo"><span>势</span><div><strong>链接势能</strong><small>商品竞争力诊断</small></div></div>
        <nav aria-label="主导航"><button className="active"><i>01</i>链接诊断</button><button><i>02</i>竞品校准</button><button><i>03</i>改进计划</button></nav>
        <div className="nav-note"><span>判断边界</span><p>基于公开发布时间、销量与页面信息推断流量形成原因，不冒充平台后台的真实曝光或点击数据。</p></div>
        <div className="operator"><div>GH</div><span><strong>商品经营负责人</strong><small>竞争力工作区</small></span></div>
      </aside>

      <main className="workspace">
        <header className="topbar"><div><span>商品增长 / 链接竞争力</span><h1>商品链接势能分析</h1></div><div className="top-actions"><span className={ready ? "real-tag" : "waiting-tag"}>{ready ? "可生成诊断" : "等待公开数据"}</span></div></header>

        <section className="product-entry">
          <div className="entry-copy"><span className="eyebrow">LINK MOMENTUM</span><h2>从上架时间与销量速度，判断客流形成原因</h2><p>读取公开商品信息，计算上架天数、日均销量和销售动能，再结合搜索词与页面表达给出可执行的改进建议。</p></div>
          <div className="entry-form link-form">
            <label><span>商品链接</span><div><input value={url} onChange={(event) => { setUrl(event.target.value); setProduct(null); }} placeholder="粘贴淘宝、天猫或拼多多商品链接"/><button disabled={loading} onClick={inspectProduct} aria-label="识别商品链接">{loading ? "读取中" : "识别"}</button></div></label>
            <label><span>核心搜索词</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="例如：婴儿柔纸巾"/></label>
          </div>
        </section>

        {product && <section className={`product-result ${product.error ? "error" : ""}`}>
          {product.image ? <img src={product.image} alt="商品主图"/> : <div className="product-placeholder">{product.platform?.slice(0, 1) || "链"}</div>}
          <div><span>{product.platform || "商品链接"}{product.productId ? ` · ID ${product.productId}` : ""}</span><h3>{product.title || (product.error ? "读取失败" : "商品链接已识别")}</h3><p>{product.error || product.message}</p></div>
          <b>{product.status === "captured" ? "公开字段已读取" : product.error ? "读取失败" : "需要补充字段"}</b>
        </section>}

        <section className="evidence-panel panel">
          <div className="panel-head"><div><span>分析证据</span><h3>核对平台公开字段</h3></div><small>无法读取时可手动补充；系统不会猜测</small></div>
          <div className="evidence-fields">
            <label><span>发布时间 / 上架日期</span><input type="date" value={publishedAt} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setPublishedAt(event.target.value)}/><small>{publishedAt ? `距今 ${report.listingDays} 天` : "等待读取或手动填写"}</small></label>
            <label><span>公开销量</span><input type="number" min="0" value={salesVolume} onChange={(event) => setSalesVolume(event.target.value)} placeholder="例如：1280"/><small>请按页面公开口径填写</small></label>
            <label><span>销量口径</span><select value={salesPeriod} onChange={(event) => setSalesPeriod(event.target.value as "cumulative" | "monthly")}><option value="cumulative">累计销量</option><option value="monthly">近30天销量</option></select><small>口径会影响日均销量计算</small></label>
          </div>
        </section>

        {ready ? <>
          <section className="metrics-grid momentum-metrics">
            <article><div><span>上架时间</span><em>{report.listingDays <= 45 ? "新品" : report.listingDays >= 180 ? "成熟链接" : "成长期"}</em></div><strong>{number(report.listingDays)}<small> 天</small></strong><small>从公开发布时间计算</small></article>
            <article className="focus"><div><span>日均销量</span><em className={report.dailySales >= 5 ? "up" : "down"}>{report.dailySales >= 5 ? "动能较强" : "需要改善"}</em></div><strong>{report.dailySales.toFixed(1)}<small> 单</small></strong><small>销量 ÷ 对应统计天数</small></article>
            <article><div><span>月度速度</span><em>等速估算</em></div><strong>{number(report.estimatedMonthly)}<small> 单</small></strong><small>仅用于同类链接横向比较</small></article>
            <article><div><span>势能评分</span><em>公开证据</em></div><strong>{report.potentialScore}<small> /100</small></strong><small>销量速度、信任与搜索匹配</small></article>
          </section>

          <section className="analysis-grid momentum-grid">
            <article className="panel stage-card"><span>当前阶段判断</span><h2>{report.stage}</h2><p>{report.stageNote}</p><div className="score-bars"><label><span>销售动能</span><i><b style={{ width: `${report.velocityScore}%` }}/></i><strong>{report.velocityScore}</strong></label><label><span>销量信任</span><i><b style={{ width: `${report.trustScore}%` }}/></i><strong>{report.trustScore}</strong></label><label><span>搜索匹配</span><i><b style={{ width: `${report.searchScore}%` }}/></i><strong>{report.searchScore}</strong></label></div></article>
            <article className="panel cause-card"><span>为什么可能有客流</span><h3>基于公开证据的推断</h3><ul>{report.causes.map((cause) => <li key={cause}>{cause}</li>)}</ul><small>这些是竞争力原因推断，不是平台曝光或点击数据。</small></article>
          </section>

          <section className="diagnosis panel"><div className="diagnosis-title"><div><span>改进建议</span><h3>先修正最可能限制客流的环节</h3></div><p>{product?.platform || "商品平台"} · {keyword || "未填写搜索词"}</p></div><div className="diagnosis-list">{report.advice.map((item) => <article key={`${item.priority}-${item.title}`}><b>{item.priority}</b><div><span>可执行动作</span><h4>{item.title}</h4><p>{item.detail}</p></div><em>{item.priority === "P0" ? "优先处理" : item.priority === "P1" ? "随后验证" : "横向校准"}</em></article>)}</div></section>
        </> : <section className="empty-state panel"><div>势</div><span>等待分析证据</span><h2>先识别链接，再核对发布时间与销量</h2><p>平台公开页面可能限制服务器读取。缺失字段可以手动补充，系统只基于你确认的数据计算，不生成虚构的流量结论。</p><small>至少需要发布时间和销量；建议同时填写核心搜索词。</small></section>}

        <footer><span>所有结论均为公开页面竞争力推断，不代表店铺后台真实曝光或点击。</span><span>跨类目不可直接比较绝对销量，建议使用同关键词、同价位竞品校准。</span></footer>
      </main>
    </div>
  );
}
