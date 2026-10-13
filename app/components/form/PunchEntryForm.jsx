"use client";
import { useEffect, useState } from "react";
import moment from "moment";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { FieldLabel } from "@/app/components/ui/Field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { recordPunch, updatePunch } from "@/api/punch_pass/punch_pass";

// Radix Select can't hold an empty value, so "none" stands in for it.
const NONE = "none";

// Record a punch for a student (`entry` null) or correct one already made.
// Class and location are optional — a pass is valid for any class.
const PunchEntryForm = ({
  open,
  onOpenChange,
  studentId,
  entry,
  classes = [],
  locations = [],
  description,
  onSaved,
}) => {
  const isEdit = !!entry;
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("");
  const [classId, setClassId] = useState(NONE);
  const [locationId, setLocationId] = useState(NONE);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const when = entry ? moment(entry.used_at) : moment();
    setDate(when.toDate());
    setTime(when.format("HH:mm"));
    setClassId(entry?.class_id ?? NONE);
    setLocationId(entry?.location_id ?? (locations.length === 1 ? locations[0].id : NONE));
    setNotes(entry?.notes ?? "");
    setError("");
  }, [open, entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !time) {
      setError("Pick a date and time.");
      return;
    }
    const usedAt = moment(
      `${moment(date).format("YYYY-MM-DD")} ${time}`,
      "YYYY-MM-DD HH:mm"
    ).toISOString();
    const values = {
      usedAt,
      classId: classId === NONE ? null : classId,
      locationId: locationId === NONE ? null : locationId,
      notes,
    };

    setSaving(true);
    if (isEdit) {
      if (await updatePunch(entry.id, values)) onSaved("Entry updated.");
      else setError("Couldn't update the entry. Check your connection and try again.");
    } else {
      const { error: punchError } = await recordPunch({ studentId, ...values });
      if (punchError) setError(punchError);
      else onSaved("Entry recorded.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent>
        <DialogTitle>{isEdit ? "Correct entry" : "Record entry"}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker label="Date" value={date} onChange={setDate} />
            <div className="w-full">
              <FieldLabel htmlFor="punch-time">Time</FieldLabel>
              <Input
                id="punch-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <Select
            label="Class"
            value={classId}
            onChange={setClassId}
            options={[
              { value: NONE, label: "No class" },
              ...classes.map((c) => ({ value: c.id, label: c.label })),
            ]}
          />
          <Select
            label="Location"
            value={locationId}
            onChange={setLocationId}
            options={[
              { value: NONE, label: "No location" },
              ...locations.map((l) => ({ value: l.id, label: l.name })),
            ]}
          />
          <div className="w-full">
            <FieldLabel htmlFor="punch-notes">Notes</FieldLabel>
            <Input
              id="punch-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogActions>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save" : "Record entry"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PunchEntryForm;
