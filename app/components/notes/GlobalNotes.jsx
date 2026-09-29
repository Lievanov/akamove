"use client";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { IconButton } from "@/app/components/ui/IconButton";
import { Toast } from "@/app/components/ui/Toast";
import { createNote } from "@/api/notes/notes";

function GlobalNotes({ currentUser, open: controlledOpen, onClose: controlledOnClose }) {
  const controlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? controlledOpen : internalOpen;
  const [notes, setNotes] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const MAX_CHARS = 500;

  useEffect(() => {
    setNotes("");
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
    try {
      const { data, error } = await createNote({
        note: notes,
        user_id: currentUser.id,
      });

      if (error) throw error;
      setShowAlert(true);
      handleClose();
    } catch (error) {
      console.error("Error saving note:", error);
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
          <FileText className="h-5 w-5 text-red-600" />
        </IconButton>
      )}
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Notes</DialogTitle>
          <Input
            autoFocus
            rows={8}
            value={notes}
            onChange={handleNotesChange}
          />
          <p
            className={`mt-1 text-right text-xs ${
              notes.length === MAX_CHARS ? "text-red-600" : "text-brand-dark/50"
            }`}
          >
            {notes.length}/{MAX_CHARS} characters
          </p>
          <DialogActions>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Create</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
      {showAlert && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            text="Note Saved!"
            severity="success"
            duration={4000}
            onExited={() => setShowAlert(false)}
          />
        </div>
      )}
    </>
  );
}

export default GlobalNotes;
