import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/sidebar";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return {
    metadataBase: new URL(baseUrl),
    title: "Mission Control Dashboard",
    description: "Multi-Agent Orchestration System Dashboard - Monitor Rose, Cathy, and Ruthie",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Mission Control Dashboard",
      description: "Multi-Agent Orchestration System Dashboard",
      images: ["/og-image.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 w-full ml-0 md:ml-[80px] lg:ml-[256px] px-3 py-4 pt-14 sm:px-4 sm:pt-16 md:pt-6 md:px-6 lg:px-8 lg:py-8 transition-all overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
