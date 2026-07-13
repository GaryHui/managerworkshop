import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og-daily-coach.png`;
  const title = "AI上新增长代理｜让商品更值得平台分发";
  const description = "粘贴商品链接或填写真实规格，生成发布检查、标题与SKU方案、五张商品图结构和7天流量实验。";
  return {
    title,
    description,
    metadataBase: new URL(`${protocol}://${host}`),
    openGraph: { title, description, type: "website", locale: "zh_CN", images: [{ url: image, width: 1200, height: 630, alt: "AI上新增长代理" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
