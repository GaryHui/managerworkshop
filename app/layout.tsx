import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "全店经营舱｜多店铺管理中心",
  description: "统一管理淘宝、拼多多企业店和个人分销店的商品、推广、价格与利润。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
