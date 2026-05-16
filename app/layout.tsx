import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/provider";
import { LocaleToggle } from "@/components/locale-toggle";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrennHub — indie tools by brenn",
  description: "A factory of small, sharp, opinionated tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-locale={DEFAULT_LOCALE}
      data-color-scheme="kr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <LocaleProvider>
          <ColorSchemeProvider>
            <CurrencyProvider>
              <header className="flex justify-end px-4 pt-4 sm:px-6">
                <LocaleToggle />
              </header>
              {children}
            </CurrencyProvider>
          </ColorSchemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
