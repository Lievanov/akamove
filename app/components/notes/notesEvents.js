// Lets anything that adds or completes a note tell the sidebar to
// refresh its pending-notes badge, without a shared store.
export const NOTES_CHANGED_EVENT = "akamove:notes-changed";

export const notifyNotesChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTES_CHANGED_EVENT));
  }
};
