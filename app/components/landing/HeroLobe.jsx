"use client";
import { useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/Button";
import { useGoogleSignIn } from "./useGoogleSignIn";
import { LobeDivider } from "./LobeDivider";

function HeroLobe() {
  const sectionRef = useRef(null);
  const signInWithGoogle = useGoogleSignIn();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      section.style.setProperty("--reveal", "1");
      return;
    }

    // The very first hint of a scroll — even a single pixel — triggers the
    // reveal; a short CSS transition (see globals.css) does the animating
    // from there, rather than dragging the reveal out over the whole hero.
    // The app's scroll container isn't always `window` (the dashboard shell
    // scrolls `<body>` internally), so listen in the capture phase: a
    // "scroll" event never bubbles, but capture still sees it on its way
    // down from `window`, regardless of which element actually scrolled.
    const trigger = () => {
      section.style.setProperty("--reveal", "1");
      window.removeEventListener("scroll", trigger, true);
    };

    window.addEventListener("scroll", trigger, { capture: true, passive: true });

    return () => {
      window.removeEventListener("scroll", trigger, true);
    };
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="hero-stage relative flex min-h-[640px] flex-col justify-center overflow-hidden bg-white px-6 pb-32 pt-20 sm:min-h-[720px] sm:px-10 lg:min-h-[820px] lg:px-16"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="max-w-xl">
          <h1 className="font-display text-[13vw] leading-[0.98] tracking-[-0.03em] text-brand-dark sm:text-6xl lg:text-7xl">
            Forget the sheet.
            <br />
            Move to the cloud.
          </h1>
          <p className="mt-6 max-w-md text-lg text-brand-dark/70">
            Students, classes, payments, and everything else your studio runs
            on — off the clipboard and into one place built for how dance
            studios actually work.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => signInWithGoogle()}
            >
              Start free
            </Button>
            <a
              href="#front-desk"
              className="text-sm font-medium text-brand-dark/60 underline-offset-4 hover:text-brand-dark hover:underline"
            >
              See what&apos;s inside
            </a>
          </div>
        </div>

        <div className="relative mx-auto h-[360px] w-full max-w-sm lg:h-[420px]">
          {/* The sheet: a spreadsheet grid, fading and lifting away */}
          <svg
            viewBox="0 0 320 380"
            className="hero-sheet absolute inset-0 h-full w-full"
            style={{ filter: "drop-shadow(0 18px 30px rgba(27,14,30,0.14))" }}
            aria-hidden="true"
          >
            <rect
              x="16"
              y="10"
              width="288"
              height="360"
              rx="8"
              fill="#F7E7E2"
              opacity="0.5"
            />
            <rect
              x="16"
              y="10"
              width="288"
              height="360"
              rx="8"
              fill="none"
              stroke="#1B0E1E"
              strokeOpacity="0.5"
              strokeWidth="2"
            />

            {/* column letters */}
            {["A", "B", "C", "D"].map((letter, col) => (
              <text
                key={letter}
                x={73 + col * 66}
                y="26"
                textAnchor="middle"
                className="font-sans"
                fontSize="11"
                fill="#1B0E1E"
                fillOpacity="0.45"
              >
                {letter}
              </text>
            ))}
            {/* row numbers */}
            {[1, 2, 3, 4, 5, 6].map((n, row) => (
              <text
                key={n}
                x="28"
                y={66 + row * 56}
                textAnchor="middle"
                className="font-sans"
                fontSize="11"
                fill="#1B0E1E"
                fillOpacity="0.45"
              >
                {n}
              </text>
            ))}

            {/* grid lines */}
            {[40, 106, 172, 238, 304].map((x) => (
              <line
                key={x}
                x1={x}
                y1="10"
                x2={x}
                y2="370"
                stroke="#1B0E1E"
                strokeOpacity="0.15"
                strokeWidth="1"
              />
            ))}
            {[34, 90, 146, 202, 258, 314].map((y) => (
              <line
                key={y}
                x1="16"
                y1={y}
                x2="304"
                y2={y}
                stroke="#1B0E1E"
                strokeOpacity="0.15"
                strokeWidth="1"
              />
            ))}

            {/* cell contents — column D reads as the money column */}
            {[0, 1, 2, 3, 4, 5].map((row) =>
              [0, 1, 2, 3].map((col) => {
                const filled = (row + col) % 4 !== 3;
                if (!filled) return null;
                const isMoneyCol = col === 3;
                const widthFactor = 0.4 + ((row * 3 + col) % 3) * 0.14;
                return (
                  <rect
                    key={`${row}-${col}`}
                    x={40 + col * 66 + 8}
                    y={34 + row * 56 + 24}
                    width={50 * widthFactor}
                    height="7"
                    rx="2"
                    fill={isMoneyCol ? "#E8195E" : "#1B0E1E"}
                    opacity={isMoneyCol ? 0.55 : 0.22}
                  />
                );
              })
            )}

            {/* active cell selection, like a live-edited sheet */}
            <rect
              x="106"
              y="146"
              width="66"
              height="56"
              fill="none"
              stroke="#E8195E"
              strokeWidth="2.5"
            />
            <rect x="168" y="198" width="8" height="8" fill="#E8195E" />
          </svg>

          {/* The tablet: the same roster, live in the dashboard */}
          <svg
            viewBox="0 0 320 380"
            className="hero-tablet absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <rect
              x="16"
              y="4"
              width="288"
              height="372"
              rx="28"
              fill="#1B0E1E"
              stroke="#F7E7E2"
              strokeOpacity="0.4"
              strokeWidth="2"
            />
            <rect x="40" y="34" width="240" height="28" rx="8" fill="#E8195E" />
            <rect
              x="52"
              y="42"
              width="90"
              height="12"
              rx="6"
              fill="#F7E7E2"
              opacity="0.9"
            />
            {[0, 1, 2, 3, 4].map((row) => (
              <g key={row}>
                <rect
                  x="40"
                  y={82 + row * 56}
                  width="240"
                  height="44"
                  rx="10"
                  fill="#F7E7E2"
                  opacity={row === 0 ? 0.14 : 0.08}
                />
                <circle
                  cx="62"
                  cy={104 + row * 56}
                  r="10"
                  fill="#E8195E"
                  opacity="0.9"
                />
                <rect
                  x="82"
                  y={98 + row * 56}
                  width={110 - row * 6}
                  height="8"
                  rx="4"
                  fill="#F7E7E2"
                  opacity="0.8"
                />
                <rect
                  x="82"
                  y={110 + row * 56}
                  width="70"
                  height="6"
                  rx="3"
                  fill="#F7E7E2"
                  opacity="0.4"
                />
                <rect
                  x="230"
                  y={98 + row * 56}
                  width="34"
                  height="18"
                  rx="9"
                  fill="#F7E7E2"
                  opacity="0.9"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      <LobeDivider shape="a" nextColor="pink" parallaxSpeed="slow" />
    </section>
  );
}

export { HeroLobe };
