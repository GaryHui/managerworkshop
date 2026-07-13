import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "增流参谋｜商品曝光点击分析";
  const description = "结合商品链接与卖家后台数据，诊断曝光、点击、加购和成交漏斗，生成可验证的精准增流计划。";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", locale: "zh_CN", images: [{ url: image, width: 1200, height: 630, alt: "增流参谋商品曝光点击分析" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
