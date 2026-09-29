import { Source_Sans_3, Fraunces } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fraunces = Fraunces({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata = {
  title: "aka Move",
  description: "aka Move Indianapolis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
