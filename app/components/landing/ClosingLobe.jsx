import Image from "next/image";
import { Button } from "@/app/components/ui/Button";

function ClosingLobe({ onStartFree }) {
  return (
    <section
      id="closing"
      className="relative overflow-hidden bg-brand-pink px-6 py-28 text-white sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-4xl leading-tight tracking-[-0.02em] sm:text-5xl">
          Forget the sheet.
          <br />
          Move to the cloud.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-white/80">
          Free for studios up to 25 students. No clipboard required.
        </p>
        <div className="mt-9 flex justify-center">
          <Button size="lg" variant="secondary" onClick={() => onStartFree?.()}>
            Start free
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-24 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/20 pt-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Image
            src="/images/am_logo.png"
            width={26}
            height={26}
            alt="aka Move logo"
          />
          <span className="font-display text-sm tracking-wide text-white/90">
            aka Move
          </span>
        </div>
        <p className="text-xs text-white/80">
          © {new Date().getFullYear()} aka Move. Built with love for every
          class.
        </p>
      </div>
    </section>
  );
}

export { ClosingLobe };
