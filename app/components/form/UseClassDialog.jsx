"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { Button } from "@/app/components/ui/Button";
import { Combobox } from "@/app/components/ui/Combobox";
import { Input } from "@/app/components/ui/Input";
import { recordPrivateLessonUsed } from "@/api/private_lesson/private_lesson";
import { getAllInstructors } from "@/api/instructor/instructor";

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function UseClassDialog({ open, onClose, lesson, onSuccess }) {
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [lessonDate, setLessonDate] = useState(todayLocalISO());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLessonDate(todayLocalISO());
    const fetchInstructors = async () => {
      const data = await getAllInstructors();
      setInstructors(data || []);
      if (lesson?.instructor_id) {
        const current = (data || []).find((i) => i.id === lesson.instructor_id);
        setSelectedInstructor(current || null);
      }
    };
    fetchInstructors();
  }, [open, lesson]);

  const handleConfirm = async () => {
    if (!selectedInstructor || !lessonDate) return;
    setLoading(true);
    const used_at = new Date(lessonDate + "T12:00:00").toISOString();
    const success = await recordPrivateLessonUsed(lesson.id, selectedInstructor.id, used_at);
    setLoading(false);
    if (success) {
      onSuccess?.();
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedInstructor(null);
    setLessonDate(todayLocalISO());
    onClose();
  };

  const remaining = lesson
    ? lesson.lessons_purchased - lesson.lessons_used - 1
    : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogTitle>Use Class</DialogTitle>
        <p className="mb-4 text-sm text-brand-dark/70">
          This will record one lesson used.{" "}
          {remaining >= 0
            ? `${remaining} lesson(s) will remain.`
            : "No lessons remaining."}
        </p>
        <div className="space-y-4">
          <Combobox
            label="Instructor"
            value={selectedInstructor}
            onChange={setSelectedInstructor}
            options={instructors}
            getOptionLabel={(o) => o.name}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">
              Lesson Date
            </label>
            <Input
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
            />
          </div>
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedInstructor || !lessonDate || remaining < 0}
          >
            {loading ? "Saving..." : "Confirm"}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
