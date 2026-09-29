"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { Pagination } from "@/app/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import Loading from "@/app/components/Loading";
import { getNotes, updateNote, getPreviousNotes } from "@/api/notes/notes";
import { formatDatestamp } from "@/app/components/utils/utils";
import { cn } from "@/app/components/ui/utils/cn";

function NotesTable({ notes, onToggle }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead></TableHead>
          <TableHead>Note</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.id}>
            <TableCell>
              <Checkbox
                checked={note.is_completed}
                onCheckedChange={(checked) => onToggle(note.id, checked)}
              />
            </TableCell>
            <TableCell
              className={cn(
                "w-3/5 whitespace-normal break-words",
                note.is_completed && "text-brand-dark/40 line-through"
              )}
            >
              {note.note}
            </TableCell>
            <TableCell>{formatDatestamp(note.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Notes() {
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [notes, setNotes] = useState([]);
  const [previousNotes, setPreviousNotes] = useState([]);
  const [previousNoteCount, setPreviousNoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noteCount, setNoteCount] = useState(0);
  const [page, setPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(1);
  const [previousOpen, setPreviousOpen] = useState(false);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    retrieveNotes(0, 10);
    retrievePreviousNotes(0, 10);
    setLoading(false);
  }, []);

  const retrieveNotes = async (startPage, endPage) => {
    const data = await getNotes(startPage, endPage);
    setNoteCount(data.length);
    setNotes(data);
  };

  const retrievePreviousNotes = async (startPage, endPage) => {
    const data = await getPreviousNotes(startPage, endPage);
    setPreviousNotes(data);
    setPreviousNoteCount(data.length);
  };

  const handlePagination = (value) => {
    setPage(value);
    const start = (value - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    retrieveNotes(start, end);
  };

  const handlePreviousPagination = (value) => {
    setPreviousPage(value);
    const start = (value - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    retrievePreviousNotes(start, end);
  };

  const handleChange = async (id, value) => {
    if (await updateNote(id, value)) {
      // Update both notes and previousNotes arrays
      setNotes(
        notes.map((note) =>
          note.id === id ? { ...note, is_completed: value } : note
        )
      );
      setPreviousNotes(
        previousNotes.map((note) =>
          note.id === id ? { ...note, is_completed: value } : note
        )
      );

      setAlert({ text: "Note updated", severity: "success" });

      // Refresh both tables to reflect the changes
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;
      retrieveNotes(start, end);

      const prevStart = (previousPage - 1) * ITEMS_PER_PAGE;
      const prevEnd = prevStart + ITEMS_PER_PAGE - 1;
      retrievePreviousNotes(prevStart, prevEnd);
    } else {
      setAlert({ text: "Error updating note", severity: "error" });
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <PageHeader title="Notes" />
      <div className="mx-auto mb-8 max-w-5xl px-4">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="my-6 rounded-lg border border-brand-dark/10 p-2">
          <NotesTable notes={notes} onToggle={handleChange} />
          <div className="mt-4">
            <Pagination
              page={page}
              totalItems={noteCount}
              pageSize={ITEMS_PER_PAGE}
              onChange={handlePagination}
            />
          </div>
        </div>

        <div className="rounded-lg border border-brand-dark/10">
          <button
            type="button"
            onClick={() => setPreviousOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-brand-dark"
          >
            Previous Notes
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                previousOpen && "rotate-180"
              )}
            />
          </button>
          {previousOpen && (
            <div className="border-t border-brand-dark/10 p-2">
              <NotesTable notes={previousNotes} onToggle={handleChange} />
              <div className="mt-4">
                <Pagination
                  page={previousPage}
                  totalItems={previousNoteCount}
                  pageSize={ITEMS_PER_PAGE}
                  onChange={handlePreviousPagination}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Notes;
