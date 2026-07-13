const allowed = ["taobao.com", "tmall.com", "yangkeduo.com", "pinduoduo.com"];

function permitted(host: string) {
  return allowed.some(domain => host === domain || host.endsWith(`.${domain}`));
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1].trim());
  }
  return "";
}

export async function POST(request: Request) {
  let target: URL;
  try {
    const { url } = await request.json() as { url?: string };
    if (!url) return Response.json({ error: "缺少商品链接" }, { status: 400 });
    target = new URL(url);
  } catch {
    return Response.json({ error: "商品链接格式不正确" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(target.protocol) || !permitted(target.hostname)) {
    return Response.json({ error: "目前仅支持淘宝、天猫和拼多多商品链接" }, { status: 400 });
  }

  const platform = target.hostname.includes("yangkeduo") || target.hostname.includes("pinduoduo") ? "拼多多" : target.hostname.includes("tmall") ? "天猫" : "淘宝";
  const productId = target.searchParams.get("goods_id") || target.searchParams.get("id") || target.searchParams.get("itemId") || "";

  try {
    const response = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    });
    const html = (await response.text()).slice(0, 2_000_000);
    const finalUrl = response.url || target.toString();
    const title = meta(html, "og:title") || decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "");
    const description = meta(html, "og:description") || meta(html, "description");
    const image = meta(html, "og:image");
    const price = html.match(/(?:price|normalPrice|groupPrice)["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)/i)?.[1] || "";
    const blocked = !response.ok || /login|登录|验证码|verify|访问受限|安全验证/i.test(`${finalUrl} ${title}`);
    const captured = Boolean(title) && !blocked;

    return Response.json({
      url: target.toString(),
      finalUrl,
      platform,
      productId,
      title: captured ? title : "",
      description: captured ? description : "",
      image: captured ? image : "",
      price: captured ? price : "",
      status: captured ? "captured" : "needs_browser",
      message: captured ? "已读取公开商品信息" : "商品 ID 已识别；平台未向服务器返回公开详情，未生成或猜测商品资料。",
    });
  } catch {
    return Response.json({
      url: target.toString(),
      platform,
      productId,
      status: "needs_browser",
      message: "商品 ID 已识别；平台限制服务器访问，未生成或猜测商品资料。",
    });
  }
}
