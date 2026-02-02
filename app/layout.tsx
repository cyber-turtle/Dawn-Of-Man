import type { Metadata } from "next";
import { Cinzel, Italiana, Syncopate } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const italiana = Italiana({
  variable: "--font-italiana",
  subsets: ["latin"],
  weight: ["400"],
});

const syncopate = Syncopate({
  variable: "--font-syncopate",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "THE CREATION | DAWN OF MAN",
  description: "A digital deconstruction of the Sistine Chapel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${italiana.variable} ${syncopate.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
