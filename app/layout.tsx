import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const title = "AI上新增长代理｜让商品更值得平台分发";
  const description = "结合商品规格、进货成本、运费和推广目标，生成标题关键词、组合装定价、发布检查与真实流量实验。";
  return {
    title,
    description,
    metadataBase: new URL(`${protocol}://${host}`),
    openGraph: { title, description, type: "website", locale: "zh_CN" },
    twitter: { card: "summary", title, description },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
