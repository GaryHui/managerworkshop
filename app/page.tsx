"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type DayRow = {
  date: string;
  impressions: number;
  clicks: number;
  carts: number;
  orders: number;
  spend: number;
  revenue: number;
};

type ProductInspection = {
  platform?: string;
  productId?: string;
  title?: string;
  description?: string;
  image?: string;
  price?: string;
  status?: "captured" | "needs_browser";
  message?: string;
  error?: string;
};

type DataSource = { name: string; importedAt: string };

const sum = (rows: DayRow[], key: keyof Omit<DayRow, "date">) => rows.reduce((total, row) => total + row[key], 0);
const percent = (value: number) => `${value.toFixed(2)}%`;
const money = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value);
const safeRate = (top: number, bottom: number) => bottom ? (top / bottom) * 100 : 0;

function parseCsv(text: string): DayRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(x => x.trim().toLowerCase());
  const aliases: Record<keyof DayRow, string[]> = {
    date: ["date", "日期", "day"],
    impressions: ["impressions", "曝光", "曝光量", "展现量"],
    clicks: ["clicks", "点击", "点击量"],
    carts: ["carts", "加购", "加购量"],
    orders: ["orders", "订单", "成交", "支付订单"],
    spend: ["spend", "花费", "消耗", "广告花费"],
    revenue: ["revenue", "销售额", "成交金额", "gmv"],
  };
  const indexOf = (key: keyof DayRow) => headers.findIndex(header => aliases[key].includes(header));
  const positions = Object.fromEntries((Object.keys(aliases) as (keyof DayRow)[]).map(key => [key, indexOf(key)])) as Record<keyof DayRow, number>;
  if (positions.date < 0 || positions.impressions < 0 || positions.clicks < 0) return [];
  return lines.slice(1).map(line => {
    const cells = line.split(",").map(x => x.trim().replace(/^"|"$/g, ""));
    const get = (key: keyof Omit<DayRow, "date">) => Math.max(0, Number(cells[positions[key]]) || 0);
    return { date: cells[positions.date], impressions: get("impressions"), clicks: get("clicks"), carts: get("carts"), orders: get("orders"), spend: get("spend"), revenue: get("revenue") };
  }).filter(row => row.date);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<DayRow[]>([]);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [product, setProduct] = useState<ProductInspection | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeView, setActiveView] = useState<"overview" | "data" | "plan">("overview");
  const fileRef = useRef<HTMLInputElement>(null);

  const report = useMemo(() => {
    const impressions = sum(rows, "impressions");
    const clicks = sum(rows, "clicks");
    const carts = sum(rows, "carts");
    const orders = sum(rows, "orders");
    const spend = sum(rows, "spend");
    const revenue = sum(rows, "revenue");
    const ctr = safeRate(clicks, impressions);
    const cartRate = safeRate(carts, clicks);
    const conversion = safeRate(orders, clicks);
    const roas = spend ? revenue / spend : 0;
    const split = Math.max(1, Math.floor(rows.length / 2));
    const first = rows.slice(0, split);
    const second = rows.slice(split);
    const firstCtr = safeRate(sum(first, "clicks"), sum(first, "impressions"));
    const secondCtr = safeRate(sum(second, "clicks"), sum(second, "impressions"));
    const impressionTrend = safeRate(sum(second, "impressions") / Math.max(second.length, 1) - sum(first, "impressions") / Math.max(first.length, 1), sum(first, "impressions") / Math.max(first.length, 1));
    const ctrTrend = firstCtr ? ((secondCtr - firstCtr) / firstCtr) * 100 : 0;
    const health = Math.round(Math.max(0, Math.min(100, 42 + Math.min(ctr / 3, 1) * 22 + Math.min(cartRate / 10, 1) * 16 + Math.min(conversion / 4, 1) * 20)));
    return { impressions, clicks, carts, orders, spend, revenue, ctr, cartRate, conversion, roas, impressionTrend, ctrTrend, health };
  }, [rows]);

  const maxImpressions = Math.max(...rows.map(row => row.impressions), 1);
  const platform = url.includes("pinduoduo") || url.includes("yangkeduo") ? "拼多多" : url.includes("tmall") ? "天猫" : url.includes("jd.com") ? "京东" : "淘宝";
  const trendTitle = report.ctrTrend < -5 ? "曝光扩张，但点击效率下降" : report.impressionTrend < -5 ? "曝光量正在收缩" : report.ctr >= 2.8 ? "点击效率达到当前规则目标" : "点击率仍有提升空间";
  const trendNote = report.ctrTrend < -5
    ? `后半周期 CTR 较前半周期下降 ${Math.abs(report.ctrTrend).toFixed(1)}%，新增曝光没有带来同比例点击，应先检查搜索词匹配和主图。`
    : report.impressionTrend < -5
      ? `后半周期日均曝光下降 ${Math.abs(report.impressionTrend).toFixed(1)}%，应先排查关键词覆盖、预算和商品可投状态。`
      : `后半周期日均曝光变化 ${report.impressionTrend.toFixed(1)}%，CTR 变化 ${report.ctrTrend.toFixed(1)}%。建议保持单变量测试，观察至少 3 天。`;
  const primaryIssue = report.ctr < 2.8 ? "点击效率" : report.cartRate < 10 ? "加购承接" : report.conversion < 4 ? "成交转化" : "流量结构";
  const targetCtr = report.ctr < 2.8 ? 2.8 : report.ctr * 1.1;

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function handleCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const parsed = parseCsv(text);
      if (!parsed.length) return flash("未识别到数据，请检查 CSV 表头");
      setRows(parsed);
      setDataSource({ name: file.name, importedAt: new Date().toLocaleString("zh-CN", { hour12: false }) });
      setActiveView("overview");
      flash(`已导入 ${parsed.length} 天真实经营数据`);
    });
    event.target.value = "";
  }

  function updateRow(index: number, key: keyof DayRow, value: string) {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: key === "date" ? value : Math.max(0, Number(value) || 0) } : row));
    setDataSource(current => current ?? { name: "手工录入", importedAt: new Date().toLocaleString("zh-CN", { hour12: false }) });
  }

  async function inspectProduct() {
    if (!url.trim()) return flash("请先粘贴商品链接");
    setInspectLoading(true);
    setProduct(null);
    try {
      const response = await fetch("/api/inspect-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const result = await response.json() as ProductInspection;
      if (!response.ok) throw new Error(result.error || "商品链接读取失败");
      setProduct(result);
      flash(result.status === "captured" ? "已读取公开商品信息" : "已识别商品，公开页面受平台访问限制");
    } catch (error) {
      const message = error instanceof Error ? error.message : "商品链接读取失败";
      setProduct({ error: message });
      flash(message);
    } finally {
      setInspectLoading(false);
    }
  }

  function exportPlan() {
    if (!rows.length) return flash("请先导入真实经营数据");
    const plan = [
      ["优先级", "行动", "目标", "验证周期"],
      ["P0", "暂停高曝光低点击词，拆分精准长尾词计划", "点击率提升至 2.8%", "48小时"],
      ["P0", "主图A/B测试：结果图 vs 核心利益点图", "单版本至少5000曝光", "3天"],
      ["P1", "补充规格对比、使用场景与发货承诺", "加购率提升至10%", "5天"],
      ["P1", "仅对高转化词增加20%预算", "ROAS不低于当前值", "7天"],
    ];
    const blob = new Blob(["\uFEFF" + plan.map(row => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "商品增流行动计划.csv";
    anchor.click();
    URL.revokeObjectURL(href);
    flash("行动计划已导出");
  }

  return (
    <div className="product-shell">
      <aside className="side-nav">
        <div className="logo"><span>增</span><div><strong>增流参谋</strong><small>商品增长工作台</small></div></div>
        <nav aria-label="主导航">
          <button className="active"><i>01</i>链接诊断</button>
          <button onClick={() => setActiveView("data")}><i>02</i>数据导入</button>
          <button onClick={() => setActiveView("plan")}><i>03</i>增流计划</button>
        </nav>
        <div className="nav-note"><span>数据说明</span><p>商品链接只用于识别商品。曝光与点击请从卖家后台导入，分析结果才可靠。</p></div>
        <div className="operator"><div>GH</div><span><strong>经营负责人</strong><small>卖家工作区</small></span><b>•••</b></div>
      </aside>

      <main className="workspace">
        {notice && <div className="toast">✓ {notice}</div>}
        <header className="topbar"><div><span>商品增长 / 链接诊断</span><h1>曝光点击分析</h1></div><div className="top-actions"><span className={rows.length ? "real-tag" : "waiting-tag"}>{rows.length ? "真实数据" : "等待数据"}</span><button className="ghost" onClick={() => fileRef.current?.click()}>导入后台报表</button><button className="primary" disabled={!rows.length} onClick={exportPlan}>导出行动计划</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsv} /></div></header>

        <section className="product-entry">
          <div className="entry-copy"><span className="eyebrow">PRODUCT URL</span><h2>从一个商品链接，定位流量漏点</h2><p>结合卖家后台曝光、点击、加购、成交与投放数据，找到应该先改关键词、主图还是承接页。</p></div>
          <div className="entry-form"><label><span>商品链接</span><div><input value={url} onChange={e => { setUrl(e.target.value); setProduct(null); }} placeholder="粘贴淘宝、天猫或拼多多商品链接"/><button disabled={inspectLoading} onClick={inspectProduct} aria-label="识别商品链接">{inspectLoading ? "读取中" : "识别"}</button></div></label><label><span>核心搜索词</span><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="例如：婴儿柔纸巾"/></label></div>
        </section>

        {product && <section className={`product-result ${product.error ? "error" : ""}`}>
          {product.image ? <img src={product.image} alt="商品主图" /> : <div className="product-placeholder">{product.platform?.slice(0, 1) || "商"}</div>}
          <div><span>{product.platform || "商品识别"}{product.productId ? ` · ID ${product.productId}` : ""}</span><h3>{product.title || (product.error ? "读取失败" : "已识别商品链接")}</h3><p>{product.error || product.message || "未返回公开商品资料"}</p></div>
          <b>{product.status === "captured" ? "公开信息已读取" : product.error ? "失败" : "平台限制"}</b>
        </section>}

        <div className="view-tabs" role="tablist">
          <button className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>诊断总览</button>
          <button className={activeView === "data" ? "active" : ""} onClick={() => setActiveView("data")}>逐日数据</button>
          <button className={activeView === "plan" ? "active" : ""} onClick={() => setActiveView("plan")}>7天增流计划</button>
        </div>

        {activeView === "overview" && (rows.length ? <>
          <div className="source-strip"><span>数据来源：{dataSource?.name || "手工录入"}</span><span>导入时间：{dataSource?.importedAt || "当前会话"}</span><b>{rows.length} 天记录</b></div>
          <section className="metrics-grid">
            <article><div><span>总曝光</span><em className="up">↑ {Math.abs(report.impressionTrend).toFixed(1)}%</em></div><strong>{report.impressions.toLocaleString()}</strong><small>后半周期日均较前半周期</small></article>
            <article><div><span>总点击</span><em className="down">↓ {Math.abs(report.ctrTrend).toFixed(1)}%</em></div><strong>{report.clicks.toLocaleString()}</strong><small>曝光上涨，但点击效率走低</small></article>
            <article className="focus"><div><span>点击率 CTR</span><em>目标 ≥ 2.80%</em></div><strong>{percent(report.ctr)}</strong><small>距建议目标还差 {Math.max(0, 2.8 - report.ctr).toFixed(2)} 个百分点</small></article>
            <article><div><span>投产 ROAS</span><em className={report.roas >= 3 ? "up" : "down"}>{report.roas >= 3 ? "健康" : "偏低"}</em></div><strong>{report.roas.toFixed(2)}</strong><small>{money(report.spend)} 花费带来 {money(report.revenue)}</small></article>
          </section>

          <section className="analysis-grid">
            <article className="panel trend-panel"><div className="panel-head"><div><span>曝光与点击趋势</span><h3>{trendTitle}</h3></div><div className="legend"><i></i>曝光 <i></i>点击率</div></div><div className="chart" aria-label="逐日曝光与点击率趋势图">{rows.map(row => { const ctr = safeRate(row.clicks, row.impressions); return <div className="chart-col" key={row.date}><div className="bar-zone"><span className="ctr-dot" style={{ bottom: `${Math.min(90, ctr * 24)}%` }} title={`点击率 ${percent(ctr)}`}></span><i style={{ height: `${Math.max(8, (row.impressions / maxImpressions) * 100)}%` }}></i></div><small>{row.date}</small></div>})}</div><div className="chart-note"><span>关键变化</span><p>{trendNote}</p></div></article>

            <article className="panel score-panel"><div className="panel-head"><div><span>规则健康度</span><h3>当前优先检查：{primaryIssue}</h3></div><b>{report.health}<small>/100</small></b></div><div className="score-ring" style={{ "--score": `${report.health * 3.6}deg` } as React.CSSProperties}><div><strong>{report.health}</strong><span>规则评分</span></div></div><ul><li><span>总曝光</span><b>{report.impressions.toLocaleString()}</b></li><li><span>点击率</span><b className={report.ctr < 2.8 ? "warn" : "good"}>{percent(report.ctr)}</b></li><li><span>加购承接</span><b>{percent(report.cartRate)}</b></li><li><span>点击成交</span><b>{percent(report.conversion)}</b></li></ul></article>
          </section>

          <section className="diagnosis panel"><div className="diagnosis-title"><div><span>基于导入数据的优先级</span><h3>先处理{primaryIssue}，再逐步放大流量</h3></div><p>{product?.platform || platform} · {keyword || "未填写关键词"}</p></div><div className="diagnosis-list">
            <article><b>P0</b><div><span>数据证据</span><h4>{report.ctr < 2.8 ? "核查搜索词与主图点击力" : report.cartRate < 10 ? "提高点击后的加购承接" : "保持流量精准度"}</h4><p>{report.ctr < 2.8 ? `当前 CTR 为 ${percent(report.ctr)}，低于页面规则目标 2.80%。建议拆分高意图搜索词，并对主图进行单变量 A/B 测试。` : `当前 CTR 为 ${percent(report.ctr)}，加购率为 ${percent(report.cartRate)}。先围绕当前最弱环节进行小范围验证。`}</p></div><em>优先处理</em></article>
            <article><b>P1</b><div><span>素材实验</span><h4>每次只改变一个变量</h4><p>A 版突出核心利益点，B 版展示使用结果；使用相同人群与时段，达到足够曝光后再判断，避免把随机波动当成提升。</p></div><em>需要验证</em></article>
            <article><b>P1</b><div><span>详情承接</span><h4>根据 {percent(report.cartRate)} 的加购率补齐购买理由</h4><p>把适用人群、规格差异、发货承诺和常见疑问前置；只有加购与成交同步改善后，才增加预算。</p></div><em>持续观察</em></article>
          </div></section>
        </> : <section className="empty-state panel">
          <div>真</div><span>等待真实经营数据</span><h2>不导入数据，就不生成结论</h2><p>商品链接只能识别公开商品信息，无法提供店铺私有的曝光、点击和广告消耗。请从淘宝生意参谋、直通车或其他卖家后台导出 CSV 报表后再分析。</p><button className="primary" onClick={() => fileRef.current?.click()}>导入后台报表</button><small>最低要求：日期、曝光量、点击量三列</small>
        </section>)}

        {activeView === "data" && <section className="data-layout">
          <article className="panel import-card"><span>导入真实数据</span><h2>上传卖家后台 CSV 报表</h2><p>支持中英文表头：日期、曝光量、点击量、加购量、订单、花费、销售额。至少需要日期、曝光和点击三列。</p><button className="primary" onClick={() => fileRef.current?.click()}>选择 CSV 文件</button><div className="privacy-note">文件只在当前浏览器中解析，不会上传到淘宝或其他第三方。</div></article>
          <article className="panel table-card"><div className="panel-head"><div><span>逐日经营数据</span><h3>{dataSource ? `${dataSource.name} · ${dataSource.importedAt}` : "尚未导入数据"}</h3></div><button onClick={() => { setRows(current => [...current, { date: "", impressions: 0, clicks: 0, carts: 0, orders: 0, spend: 0, revenue: 0 }]); setDataSource(current => current ?? { name: "手工录入", importedAt: new Date().toLocaleString("zh-CN", { hour12: false }) }); }}>＋ 添加一天</button></div>{rows.length ? <div className="table-wrap"><table><thead><tr><th>日期</th><th>曝光</th><th>点击</th><th>加购</th><th>订单</th><th>花费</th><th>销售额</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.date}-${index}`}>{(Object.keys(row) as (keyof DayRow)[]).map(key => <td key={key}><input aria-label={`${row.date} ${key}`} value={row[key]} onChange={e => updateRow(index, key, e.target.value)} /></td>)}</tr>)}</tbody></table></div> : <div className="table-empty">导入 CSV 或点击“添加一天”开始录入真实数据</div>}</article>
        </section>}

        {activeView === "plan" && (rows.length ? <section className="plan-layout">
          <article className="panel plan-summary"><span>7天实验目标</span><h2>CTR 从 {percent(report.ctr)} 提升至 {percent(targetCtr)}</h2><p>这是基于当前数据设置的验证目标，不是结果承诺；预算只向同时改善点击与成交的组合倾斜。</p><div><strong>+{Math.round(report.impressions * (targetCtr - report.ctr) / 100).toLocaleString()}</strong><span>同等曝光下的实验目标新增点击</span></div></article>
          <div className="timeline">{[
            ["DAY 1", "清理流量入口", "导出搜索词报表，暂停曝光高但 CTR 低于 1% 的词；保留成交词。", "关键词"],
            ["DAY 2", "制作主图双版本", "A版突出核心利益点，B版展示使用结果，只改变一个变量。", "素材"],
            ["DAY 3–4", "小预算并行测试", "同受众、同时段分流，每个版本积累至少 5,000 曝光。", "投放"],
            ["DAY 5", "强化详情承接", "前置规格对比、使用场景、发货时效与售后承诺。", "转化"],
            ["DAY 6–7", "放大胜出组合", "只对 CTR 与成交率同时达标的词和素材增加 20% 预算。", "复盘"],
          ].map((item, index) => <article key={item[0]}><div className="day">{item[0]}</div><div className="step-line"><i></i>{index < 4 && <span></span>}</div><div className="step-copy"><em>{item[3]}</em><h3>{item[1]}</h3><p>{item[2]}</p></div><button onClick={e => { e.currentTarget.classList.toggle("done"); }}>完成</button></article>)}</div>
        </section> : <section className="empty-state panel"><div>7</div><span>增流计划尚未生成</span><h2>需要真实漏斗数据作为证据</h2><p>导入曝光、点击、加购和订单数据后，系统才会按实际瓶颈生成行动优先级。</p><button className="primary" onClick={() => setActiveView("data")}>前往导入数据</button></section>)}

        <footer><span>分析仅基于导入数据，不读取卖家账号，不绕过平台登录或验证码。</span><span>建议用于小范围实验验证，不承诺流量或销量结果。</span></footer>
      </main>
    </div>
  );
}
