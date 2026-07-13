const allowed = ["taobao.com", "tmall.com", "yangkeduo.com", "pinduoduo.com"];

function permitted(host: string) {
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
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

function firstMatch(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return decodeHtml(value.replace(/\\u002F/g, "/").replace(/\\\"/g, '"').trim());
  }
  return "";
}

function normalizeDate(value: string) {
  if (!value) return "";
  if (/^\d{10,13}$/.test(value)) {
    const numeric = Number(value);
    const date = new Date(value.length === 10 ? numeric * 1000 : numeric);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  const match = value.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function parseSales(value: string) {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  const number = Number(normalized.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(number)) return null;
  if (/万/.test(normalized)) return Math.round(number * 10_000);
  return Math.round(number);
}

function isGenericTitle(title: string) {
  return !title || /天[猫貓]淘[宝寶]海外|淘宝网|天猫商城|拼多多.*首页|登录|验证码|访问受限/i.test(title);
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
    const rawTitle = meta(html, "og:title") || decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "");
    const title = isGenericTitle(rawTitle) ? "" : rawTitle;
    const description = title ? meta(html, "og:description") || meta(html, "description") : "";
    const image = title ? meta(html, "og:image") : "";
    const price = firstMatch(html, [
      /(?:"(?:price|normalPrice|groupPrice|promotionPrice)"|\bprice)\s*[:=]\s*["']?(\d+(?:\.\d+)?)/i,
      /[¥￥]\s*(\d+(?:\.\d+)?)/,
    ]);
    const publishedRaw = firstMatch(html, [
      /"(?:publishTime|publishedAt|createdAt|onlineTime|onsaleTime|startTime)"\s*:\s*["']?([^"',}<]+)/i,
      /(?:上架时间|发布时间|开售时间)[^\d]{0,20}((?:20\d{2})[-/.年]\d{1,2}[-/.月]\d{1,2})/i,
    ]);
    const salesRaw = firstMatch(html, [
      /"(?:totalSoldQuantity|soldCount|sellCount|salesCount|totalSales|quantitySold)"\s*:\s*["']?([\d,.]+(?:万)?)/i,
      /(?:累计已售|已售|总销量|累计销量)[^\d]{0,12}([\d,.]+(?:万)?)/i,
      /(?:月销|月销量)[^\d]{0,12}([\d,.]+(?:万)?)/i,
    ]);
    const salesPeriod = /(?:月销|月销量)[^\d]{0,12}[\d,.]+(?:万)?/i.test(html) ? "monthly" : salesRaw ? "cumulative" : "unknown";
    const publishedAt = normalizeDate(publishedRaw);
    const salesVolume = parseSales(salesRaw);
    const blocked = !response.ok || /login|登录|验证码|verify|访问受限|安全验证/i.test(`${finalUrl} ${rawTitle}`);
    const capturedFields = [title, image, price, publishedAt, salesVolume].filter((value) => value !== "" && value !== null).length;

    return Response.json({
      url: target.toString(),
      finalUrl,
      platform,
      productId,
      title,
      description,
      image,
      price,
      publishedAt,
      salesVolume,
      salesPeriod,
      status: !blocked && capturedFields > 0 ? "captured" : "partial",
      message: capturedFields > 0
        ? `已读取 ${capturedFields} 项公开字段；请核对发布时间与销量口径。`
        : "已识别商品 ID，但平台未向服务器返回公开详情；请手动补充发布时间和销量。",
    });
  } catch {
    return Response.json({
      url: target.toString(),
      platform,
      productId,
      status: "partial",
      salesVolume: null,
      salesPeriod: "unknown",
      publishedAt: "",
      message: "已识别商品 ID；平台限制服务器访问，请手动补充公开的发布时间和销量。",
    });
  }
}
