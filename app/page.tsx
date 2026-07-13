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

const seedRows: DayRow[] = [
  { date: "07-07", impressions: 14620, clicks: 412, carts: 44, orders: 15, spend: 318, revenue: 1124 },
  { date: "07-08", impressions: 15380, clicks: 425, carts: 47, orders: 16, spend: 332, revenue: 1198 },
  { date: "07-09", impressions: 17120, clicks: 458, carts: 49, orders: 17, spend: 356, revenue: 1273 },
  { date: "07-10", impressions: 18440, clicks: 466, carts: 46, orders: 14, spend: 369, revenue: 1048 },
  { date: "07-11", impressions: 20160, clicks: 474, carts: 43, orders: 13, spend: 388, revenue: 974 },
  { date: "07-12", impressions: 22840, clicks: 493, carts: 41, orders: 12, spend: 412, revenue: 899 },
  { date: "07-13", impressions: 24760, clicks: 506, carts: 39, orders: 10, spend: 436, revenue: 749 },
];

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
  const [url, setUrl] = useState("https://item.taobao.com/item.htm?id=837251906124");
  const [keyword, setKeyword] = useState("婴儿柔纸巾");
  const [rows, setRows] = useState<DayRow[]>(seedRows);
  const [isDemo, setIsDemo] = useState(true);
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
      setIsDemo(false);
      setActiveView("overview");
      flash(`已导入 ${parsed.length} 天真实经营数据`);
    });
    event.target.value = "";
  }

  function updateRow(index: number, key: keyof DayRow, value: string) {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: key === "date" ? value : Math.max(0, Number(value) || 0) } : row));
    setIsDemo(false);
  }

  function exportPlan() {
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
        <header className="topbar"><div><span>商品增长 / 链接诊断</span><h1>曝光点击分析</h1></div><div className="top-actions"><span className={isDemo ? "demo-tag" : "real-tag"}>{isDemo ? "示例数据" : "真实数据"}</span><button className="ghost" onClick={() => fileRef.current?.click()}>导入后台报表</button><button className="primary" onClick={exportPlan}>导出行动计划</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsv} /></div></header>

        <section className="product-entry">
          <div className="entry-copy"><span className="eyebrow">PRODUCT URL</span><h2>从一个商品链接，定位流量漏点</h2><p>结合卖家后台曝光、点击、加购、成交与投放数据，找到应该先改关键词、主图还是承接页。</p></div>
          <div className="entry-form"><label><span>商品链接</span><div><input value={url} onChange={e => setUrl(e.target.value)} placeholder="粘贴淘宝、天猫、拼多多或京东商品链接"/><button onClick={() => flash("链接已识别，等待经营数据")} aria-label="识别商品链接">识别</button></div></label><label><span>核心搜索词</span><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="例如：婴儿柔纸巾"/></label></div>
        </section>

        <div className="view-tabs" role="tablist">
          <button className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>诊断总览</button>
          <button className={activeView === "data" ? "active" : ""} onClick={() => setActiveView("data")}>逐日数据</button>
          <button className={activeView === "plan" ? "active" : ""} onClick={() => setActiveView("plan")}>7天增流计划</button>
        </div>

        {activeView === "overview" && <>
          <section className="metrics-grid">
            <article><div><span>总曝光</span><em className="up">↑ {Math.abs(report.impressionTrend).toFixed(1)}%</em></div><strong>{report.impressions.toLocaleString()}</strong><small>后半周期日均较前半周期</small></article>
            <article><div><span>总点击</span><em className="down">↓ {Math.abs(report.ctrTrend).toFixed(1)}%</em></div><strong>{report.clicks.toLocaleString()}</strong><small>曝光上涨，但点击效率走低</small></article>
            <article className="focus"><div><span>点击率 CTR</span><em>目标 ≥ 2.80%</em></div><strong>{percent(report.ctr)}</strong><small>距建议目标还差 {Math.max(0, 2.8 - report.ctr).toFixed(2)} 个百分点</small></article>
            <article><div><span>投产 ROAS</span><em className={report.roas >= 3 ? "up" : "down"}>{report.roas >= 3 ? "健康" : "偏低"}</em></div><strong>{report.roas.toFixed(2)}</strong><small>{money(report.spend)} 花费带来 {money(report.revenue)}</small></article>
          </section>

          <section className="analysis-grid">
            <article className="panel trend-panel"><div className="panel-head"><div><span>曝光与点击趋势</span><h3>曝光在涨，点击率连续走低</h3></div><div className="legend"><i></i>曝光 <i></i>点击率</div></div><div className="chart" aria-label="逐日曝光与点击率趋势图">{rows.map(row => { const ctr = safeRate(row.clicks, row.impressions); return <div className="chart-col" key={row.date}><div className="bar-zone"><span className="ctr-dot" style={{ bottom: `${Math.min(90, ctr * 24)}%` }} title={`点击率 ${percent(ctr)}`}></span><i style={{ height: `${Math.max(8, (row.impressions / maxImpressions) * 100)}%` }}></i></div><small>{row.date}</small></div>})}</div><div className="chart-note"><span>关键变化</span><p>最近两天曝光继续扩大，但点击增量不足。说明新增流量与商品的匹配度下降，继续加预算会放大浪费。</p></div></article>

            <article className="panel score-panel"><div className="panel-head"><div><span>流量健康度</span><h3>需要优先修复点击效率</h3></div><b>{report.health}<small>/100</small></b></div><div className="score-ring" style={{ "--score": `${report.health * 3.6}deg` } as React.CSSProperties}><div><strong>{report.health}</strong><span>待优化</span></div></div><ul><li><span>搜索曝光</span><b className="good">充足</b></li><li><span>主图点击</span><b className="warn">偏弱</b></li><li><span>加购承接</span><b>{percent(report.cartRate)}</b></li><li><span>点击成交</span><b>{percent(report.conversion)}</b></li></ul></article>
          </section>

          <section className="diagnosis panel"><div className="diagnosis-title"><div><span>优先级诊断</span><h3>先提高每 100 次曝光带来的有效点击</h3></div><p>{platform} · {keyword || "未填写关键词"}</p></div><div className="diagnosis-list">
            <article><b>P0</b><div><span>流量精准度</span><h4>暂停高曝光、低点击搜索词</h4><p>曝光增长 {Math.abs(report.impressionTrend).toFixed(1)}%，CTR 却下降 {Math.abs(report.ctrTrend).toFixed(1)}%。将宽泛词拆成 3–5 个高意图长尾词，小预算单独验证。</p></div><em>预计影响：高</em></article>
            <article><b>P0</b><div><span>素材点击力</span><h4>同时测试两套主图表达</h4><p>A 版只讲一个核心利益点；B 版展示使用结果。每版至少积累 5,000 次曝光后再判断，避免过早下结论。</p></div><em>预计影响：高</em></article>
            <article><b>P1</b><div><span>详情承接</span><h4>补齐规格比较与购买理由</h4><p>当前加购率 {percent(report.cartRate)}，应把适用人群、规格差异、发货承诺和常见疑问前置，减少点击后的犹豫。</p></div><em>预计影响：中</em></article>
          </div></section>
        </>}

        {activeView === "data" && <section className="data-layout">
          <article className="panel import-card"><span>导入真实数据</span><h2>上传卖家后台 CSV 报表</h2><p>支持中英文表头：日期、曝光量、点击量、加购量、订单、花费、销售额。至少需要日期、曝光和点击三列。</p><button className="primary" onClick={() => fileRef.current?.click()}>选择 CSV 文件</button><button className="text-button" onClick={() => { setRows(seedRows); setIsDemo(true); flash("已恢复示例数据"); }}>恢复示例数据</button></article>
          <article className="panel table-card"><div className="panel-head"><div><span>逐日经营数据</span><h3>可直接修正数值</h3></div><button onClick={() => setRows(current => [...current, { date: "", impressions: 0, clicks: 0, carts: 0, orders: 0, spend: 0, revenue: 0 }])}>＋ 添加一天</button></div><div className="table-wrap"><table><thead><tr><th>日期</th><th>曝光</th><th>点击</th><th>加购</th><th>订单</th><th>花费</th><th>销售额</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.date}-${index}`}>{(Object.keys(row) as (keyof DayRow)[]).map(key => <td key={key}><input aria-label={`${row.date} ${key}`} value={row[key]} onChange={e => updateRow(index, key, e.target.value)} /></td>)}</tr>)}</tbody></table></div></article>
        </section>}

        {activeView === "plan" && <section className="plan-layout">
          <article className="panel plan-summary"><span>7天目标</span><h2>CTR 从 {percent(report.ctr)} 提升至 2.80%</h2><p>预算不一次性放大，只让通过验证的关键词和素材获得更多流量。</p><div><strong>+{Math.round(report.impressions * (2.8 / Math.max(report.ctr, 0.1) - 1) * report.ctr / 100).toLocaleString()}</strong><span>同等曝光下潜在新增点击</span></div></article>
          <div className="timeline">{[
            ["DAY 1", "清理流量入口", "导出搜索词报表，暂停曝光高但 CTR 低于 1% 的词；保留成交词。", "关键词"],
            ["DAY 2", "制作主图双版本", "A版突出核心利益点，B版展示使用结果，只改变一个变量。", "素材"],
            ["DAY 3–4", "小预算并行测试", "同受众、同时段分流，每个版本积累至少 5,000 曝光。", "投放"],
            ["DAY 5", "强化详情承接", "前置规格对比、使用场景、发货时效与售后承诺。", "转化"],
            ["DAY 6–7", "放大胜出组合", "只对 CTR 与成交率同时达标的词和素材增加 20% 预算。", "复盘"],
          ].map((item, index) => <article key={item[0]}><div className="day">{item[0]}</div><div className="step-line"><i></i>{index < 4 && <span></span>}</div><div className="step-copy"><em>{item[3]}</em><h3>{item[1]}</h3><p>{item[2]}</p></div><button onClick={e => { e.currentTarget.classList.toggle("done"); }}>完成</button></article>)}</div>
        </section>}

        <footer><span>分析仅基于导入数据，不读取卖家账号，不绕过平台登录或验证码。</span><span>建议用于小范围实验验证，不承诺流量或销量结果。</span></footer>
      </main>
    </div>
  );
}
