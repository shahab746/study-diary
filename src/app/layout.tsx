import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#121212',
};

export const metadata: Metadata = {
  title: "Study Diary — The Study Operating System for Board Students",
  description: "Study Diary transforms the Federal Board (FBISE) syllabus into a clear daily study plan with video lectures, PDF notes, progress tracking, and exam-focused preparation. Built for 9th–12th grade students in Pakistan.",
  keywords: ["FBISE", "Federal Board", "study planner", "Pakistan", "9th class", "10th class", "11th class", "12th class", "FSc", "SSC", "HSSC", "study app", "exam preparation", "video lectures", "notes"],
  authors: [{ name: "Study Diary" }],
  creator: "Study Diary",
  openGraph: {
    title: "Study Diary — The Study Operating System for Board Students",
    description: "Transform your FBISE syllabus into a clear daily study plan with videos, notes, and progress tracking.",
    url: "https://studydiary.app",
    siteName: "Study Diary",
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Study Diary — The Study Operating System for Board Students",
    description: "Transform your FBISE syllabus into a clear daily study plan with videos, notes, and progress tracking.",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Study Diary',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
