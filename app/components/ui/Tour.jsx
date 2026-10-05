"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as RadixPopover from "@radix-ui/react-popover";
import { Button } from "./Button";

// Guided tour: dims the page, spotlights one element at a time and shows
// a popover next to it. Steps point at elements by their `data-tour`
// attribute — `{ target: "settings-prices", title, body }` highlights
// `<div data-tour="settings-prices">`. A step with no `target` is shown
// centered (good for an intro), and a step whose target isn't on the
// page (e.g. an admin-only button, for staff) is skipped.
//
// Props: `open`, `steps`, `onClose()` — fired on finish, skip or Escape.

const findTarget = (step) =>
  step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;

// Anchor for centered steps: a point a little above the middle of the
// screen, so the popover (which opens below its anchor) sits centered.
const centerRect = () =>
  new DOMRect(window.innerWidth / 2, window.innerHeight / 2 - 120, 0, 0);

const SPOTLIGHT_PADDING = 6;

function Tour({ open, steps, onClose }) {
  const [activeSteps, setActiveSteps] = useState([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const targetRef = useRef(null);
  const nextButtonRef = useRef(null);
  const virtualRef = useRef({
    getBoundingClientRect: () =>
      targetRef.current?.getBoundingClientRect() ?? centerRect(),
  });

  useEffect(() => {
    if (!open) return;
    setActiveSteps(steps.filter((step) => !step.target || findTarget(step)));
    setIndex(0);
  }, [open, steps]);

  const step = open ? activeSteps[index] : null;
  const isLast = index === activeSteps.length - 1;

  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step);
    targetRef.current = el;
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    // Capture phase so scrolling inside any container (the dashboard's
    // main content area scrolls, not the window) keeps the spotlight on.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  // The popover's portal mounts a frame after the step changes.
  useEffect(() => {
    if (!step) return;
    const frame = requestAnimationFrame(() => nextButtonRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [step]);

  if (!step) return null;

  const next = () => (isLast ? onClose() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[60]" aria-hidden="true">
          {rect ? (
            <div
              className="pointer-events-none fixed rounded-lg ring-2 ring-brand-pink transition-all duration-200"
              style={{
                top: rect.top - SPOTLIGHT_PADDING,
                left: rect.left - SPOTLIGHT_PADDING,
                width: rect.width + SPOTLIGHT_PADDING * 2,
                height: rect.height + SPOTLIGHT_PADDING * 2,
                boxShadow: "0 0 0 9999px rgb(27 14 30 / 0.55)",
              }}
            />
          ) : (
            <div className="fixed inset-0 bg-brand-dark/55" />
          )}
        </div>,
        document.body
      )}

      <RadixPopover.Root open>
        <RadixPopover.Anchor virtualRef={virtualRef} />
        <RadixPopover.Portal>
          <RadixPopover.Content
            key={index}
            side={rect ? step.side ?? "bottom" : "bottom"}
            align={rect ? step.align ?? "center" : "center"}
            sideOffset={rect ? 14 : 0}
            collisionPadding={16}
            updatePositionStrategy="always"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={onClose}
            aria-label={step.title}
            className="z-[70] w-80 max-w-[calc(100vw-32px)] rounded-lg bg-white p-5 shadow-xl focus:outline-none"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-pink-deep">
              {index + 1} of {activeSteps.length}
            </p>
            <h2 className="mt-1 text-base font-semibold text-brand-dark">
              {step.title}
            </h2>
            <div className="mt-1.5 text-sm leading-relaxed text-brand-dark/70">
              {step.body}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              {isLast ? (
                <span />
              ) : (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Skip tour
                </Button>
              )}
              <div className="flex gap-2">
                {index > 0 && (
                  <Button variant="outline" size="sm" onClick={back}>
                    Back
                  </Button>
                )}
                <Button ref={nextButtonRef} size="sm" onClick={next}>
                  {isLast ? "Got it" : "Next"}
                </Button>
              </div>
            </div>
            {rect && <RadixPopover.Arrow className="fill-white" width={14} height={7} />}
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </>
  );
}

export { Tour };
