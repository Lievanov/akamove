"use client";

import { Suspense, useEffect, useState } from "react";
import { CheckCheck, StickyNote } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ServerTableCard } from "@/app/components/ui/ServerTableCard";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/Tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import Loading from "@/app/components/Loading";
import {
  getNotes,
  updateNote,
  getPreviousNotes,
  getPendingNotesCount,
  getCompletedNotesCount,
} from "@/api/notes/notes";
import { formatDatestamp } from "@/app/components/utils/utils";
import { useServerTable } from "@/app/components/utils/useServerTable";
import { notifyNotesChanged } from "@/app/components/notes/notesEvents";
import { cn } from "@/app/components/ui/utils/cn";

const fetchPending = async ({ from, to }) => {
  const [rows, count] = await Promise.all([
    getNotes(from, to),
    getPendingNotesCount(),
  ]);
  return { rows, count };
};

const fetchDone = async ({ from, to }) => {
  const [rows, count] = await Promise.all([
    getPreviousNotes(from, to),
    getCompletedNotesCount(),
  ]);
  return { rows, count };
};

function NotesTable({ notes, onToggle, pendingIds }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">Done</span>
          </TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="hidden md:table-cell">Added by</TableHead>
          <TableHead className="hidden sm:table-cell">Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.id}>
            <TableCell>
              <Checkbox
                checked={note.is_completed}
                disabled={pendingIds.has(note.id)}
                onCheckedChange={(checked) => onToggle(note, checked)}
                label={
                  <span className="sr-only">
                    {note.is_completed ? "Mark as pending" : "Mark as done"}
                  </span>
                }
              />
            </TableCell>
            <TableCell
              className={cn(
                "w-3/5 whitespace-pre-line break-words",
                note.is_completed && "text-brand-dark/50"
              )}
            >
              {note.note}
            </TableCell>
            <TableCell className="hidden md:table-cell">{note.created_by ?? "—"}</TableCell>
            <TableCell className="hidden whitespace-nowrap sm:table-cell">
              {formatDatestamp(note.created_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Notes() {
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [tab, setTab] = useState("pending");
  const [doneCount, setDoneCount] = useState(null);
  const [pendingIds, setPendingIds] = useState(new Set());
  const pending = useServerTable({ fetchPage: fetchPending, syncUrl: false });
  const done = useServerTable({ fetchPage: fetchDone, syncUrl: false });
  const table = tab === "pending" ? pending : done;

  useEffect(() => {
    if (done.status === "ready") setDoneCount(done.total);
  }, [done.status, done.total]);

  const handleToggle = async (note, value) => {
    setPendingIds((prev) => new Set(prev).add(note.id));
    const ok = await updateNote(note.id, value);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(note.id);
      return next;
    });
    if (ok) {
      setAlert({
        text: value ? "Marked as done." : "Moved back to pending.",
        severity: "success",
      });
      pending.refresh();
      done.refresh();
      notifyNotesChanged();
    } else {
      setAlert({
        text: "Couldn't update the note. Check your connection and try again.",
        severity: "error",
      });
    }
  };

  return (
    <>
      <PageHeader title="Notes" />
      <div className="mx-auto mb-8 max-w-5xl px-4 pt-6">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending
              {pending.status === "ready" && (
                <span className="rounded-full bg-brand-dark/10 px-2 text-xs">
                  {pending.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="done">
              Done
              {doneCount !== null && (
                <span className="rounded-full bg-brand-dark/10 px-2 text-xs">
                  {doneCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {table.isLoading ? (
          <Loading variant="table" />
        ) : table.isEmpty ? (
          tab === "pending" ? (
            <EmptyState
              icon={CheckCheck}
              title="All caught up"
              description="No pending notes. Use “Add note” in the sidebar to leave one for the team."
            />
          ) : (
            <EmptyState
              icon={StickyNote}
              title="No finished notes yet"
              description="Notes you mark as done move here."
            />
          )
        ) : (
          <ServerTableCard
            table={table}
            noun={tab === "pending" ? ["pending note", "pending notes"] : ["done note", "done notes"]}
          >
            <NotesTable
              notes={table.rows}
              onToggle={handleToggle}
              pendingIds={pendingIds}
            />
          </ServerTableCard>
        )}
      </div>
    </>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Notes />
    </Suspense>
  );
}
