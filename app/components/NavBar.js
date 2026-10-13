"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import GoogleOAuth from "./oauth/GoogleOAuth";

const navLinks = [
  { label: "Features", href: "#front-desk" },
  { label: "Pricing", href: "#pricing" },
];

function ResponsiveAppBar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const startFree = () => router.push("/login?mode=signup");

  return (
    <header className="sticky top-0 z-40 border-b border-brand-dark/10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => router.push("/")}>
            <Image src="/images/am_logo.png" width={35} height={35} alt="aka Move Logo" />
          </button>
          <nav className="hidden md:flex md:items-center md:gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-brand-dark/70 hover:bg-brand-dark/5 hover:text-brand-dark"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <GoogleOAuth variant="ghost" size="sm" />
          </div>
          <Button size="sm" onClick={startFree} className="hidden sm:inline-flex">
            Start free
          </Button>
          <button
            type="button"
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-brand-dark/10 px-4 py-2 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-brand-dark hover:bg-brand-dark/5"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex items-center gap-2 px-3 py-2">
            <GoogleOAuth variant="ghost" size="sm" />
            <Button
              size="sm"
              onClick={() => {
                setMenuOpen(false);
                startFree();
              }}
            >
              Start free
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

export default ResponsiveAppBar;
