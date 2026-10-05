"use client";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { IconButton } from "@/app/components/ui/IconButton";
import { Toast } from "@/app/components/ui/Toast";
import { createNote } from "@/api/notes/notes";
import { notifyNotesChanged } from "./notesEvents";

function GlobalNotes({ currentUser, open: controlledOpen, onClose: controlledOnClose }) {
  const controlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? controlledOpen : internalOpen;
  const [notes, setNotes] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const MAX_CHARS = 500;

  useEffect(() => {
    setNotes("");
    setSaveError("");
  }, [open]);

  const handleClickOpen = () => {
    if (controlled) return;
    setInternalOpen(true);
  };

  const handleClose = () => {
    if (controlled) controlledOnClose?.();
    else setInternalOpen(false);
  };

  const handleSave = async () => {
    if (!notes.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const { error } = await createNote({
        note: notes.trim(),
        user_id: currentUser.id,
      });

      if (error) throw error;
      setShowAlert(true);
      notifyNotesChanged();
      handleClose();
    } catch (error) {
      console.error("Error saving note:", error);
      setSaveError("Couldn't save the note. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotesChange = (e) => {
    if (e.target.value.length <= MAX_CHARS) {
      setNotes(e.target.value);
    }
  };

  return (
    <>
      {!controlled && (
        <IconButton aria-label="Add note" onClick={handleClickOpen}>
          <FileText className="h-5 w-5 text-brand-pink-deep" />
        </IconButton>
      )}
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Add a note</DialogTitle>
          <DialogDescription>
            Notes show up for the whole team under Notes until someone marks
            them done.
          </DialogDescription>
          <label htmlFor="global-note" className="sr-only">
            Note
          </label>
          <Input
            id="global-note"
            autoFocus
            rows={8}
            value={notes}
            onChange={handleNotesChange}
          />
          <p
            className={`mt-1 text-right text-xs ${
              notes.length === MAX_CHARS ? "text-danger" : "text-brand-dark/50"
            }`}
          >
            {notes.length}/{MAX_CHARS} characters
          </p>
          {saveError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {saveError}
            </p>
          )}
          <DialogActions>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!notes.trim() || saving}>
              {saving ? "Saving…" : "Add note"}
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
      {showAlert && (
        <Toast
          text="Note added."
          severity="success"
          duration={4000}
          onExited={() => setShowAlert(false)}
        />
      )}
    </>
  );
}

export default GlobalNotes;
