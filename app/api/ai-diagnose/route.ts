type DiagnosePayload = {
  platform?: string; url?: string; keyword?: string; title?: string;
  sellingPoints?: string; competitorNotes?: string;
  metrics?: { impressions?: number; clicks?: number; carts?: number; orders?: number; price?: number; competitor?: number };
};

export async function POST(request: Request) {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) return Response.json({ error: "AI服务尚未配置，请先在服务端设置百炼API Key。" }, { status: 503 });
  const body = await request.json() as DiagnosePayload;
  const prompt = `你是一名严谨的中国电商商品增长分析师。请根据以下资料诊断商品的曝光、点击、转化和价格问题。不要承诺保证涨流量，不要编造无法从资料得出的销量或排名。输出中文，包含：1.核心结论；2.证据；3.标题与关键词建议；4.主图与详情建议；5.价格策略；6.七天实验计划。\n资料：${JSON.stringify(body)}`;
  const response = await fetch(process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.QWEN_MODEL || "qwen-plus-latest", messages: [{ role: "user", content: prompt }], temperature: 0.2 })
  });
  if (!response.ok) return Response.json({ error: "AI分析暂时不可用，请检查模型配置。" }, { status: 502 });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return Response.json({ report: data.choices?.[0]?.message?.content || "未生成分析结果" });
}
