import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/ui/toast"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"
import { StorageErrorListener } from "@/components/storage-error-listener"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Mind Space",
  description: "A personal mind organizer",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ConfirmProvider>
            <ToastProvider>
              <StorageErrorListener />
              {children}
            </ToastProvider>
          </ConfirmProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
