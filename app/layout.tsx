import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const title = "营业额助手｜新手电商经营工作台";
  const description = "根据售价、成本、访客、订单和推广花费，生成每日经营任务、保本投放线、商品诊断与营业额复盘。";
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
