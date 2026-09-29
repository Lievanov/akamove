const SHAPES = {
  a: "M0,120 C240,40 480,180 720,100 C960,20 1200,140 1440,80 L1440,200 L0,200 Z",
  b: "M0,90 C300,170 600,10 900,110 C1100,180 1300,60 1440,100 L1440,200 L0,200 Z",
  c: "M0,140 C260,60 520,150 780,70 C1020,10 1260,120 1440,60 L1440,200 L0,200 Z",
  d: "M0,70 C220,150 480,20 760,110 C1000,180 1260,40 1440,120 L1440,200 L0,200 Z",
  e: "M0,110 C300,30 560,170 840,90 C1080,30 1300,150 1440,70 L1440,200 L0,200 Z",
  f: "M0,60 C260,140 520,10 800,100 C1040,170 1280,50 1440,110 L1440,200 L0,200 Z",
};

const FILL = {
  pink: "fill-brand-pink",
  cream: "fill-brand-cream",
  dark: "fill-brand-dark",
  white: "fill-white",
};

/**
 * Sits at the bottom seam of a lobe, filled with the color of the lobe
 * coming next, so the following section reads as a coastline swelling in.
 */
function LobeDivider({ shape, nextColor, parallaxSpeed = "med" }) {
  return (
    <svg
      className={`lobe-divider lobe-divider--${parallaxSpeed} pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full translate-y-px sm:h-32 lg:h-40 ${FILL[nextColor]}`}
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={SHAPES[shape]} />
    </svg>
  );
}

export { LobeDivider };
