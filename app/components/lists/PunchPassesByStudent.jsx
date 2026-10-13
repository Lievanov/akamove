"use client";
import { useEffect, useState } from "react";
import moment from "moment";
import { Pencil, Ticket, Trash2, Undo2 } from "lucide-react";
import Loading from "../Loading";
import {
  getPassesByStudent,
  getPassTypes,
  deletePass,
  deletePunch,
  entriesRemaining,
  entriesUsed,
  nextPassToUse,
  passStatus,
} from "@/api/punch_pass/punch_pass";
import { getAllClasses } from "@/api/class/class";
import { getAllLocations } from "@/api/location/location";
import { getTimezone } from "@/api/settings/settings";
import { useActiveTenant } from "@/app/context/TenantContext";
import PunchPassForm from "@/app/components/form/PunchPassForm";
import PunchEntryForm from "@/app/components/form/PunchEntryForm";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Alert } from "@/app/components/ui/Alert";
import { Chip } from "@/app/components/ui/Chip";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatDate, formatMoney, getTodayInTimezone } from "@/app/components/utils/utils";

const STATUS_CHIP = {
  active: { label: "Active", tone: "success" },
  used_up: { label: "Used up", tone: "neutral" },
  expired: { label: "Expired", tone: "danger" },
};

// Days before expiry at which an active pass gets a heads-up.
const EXPIRY_WARNING_DAYS = 7;

const daysUntil = (isoDate, today) =>
  moment(isoDate, "YYYY-MM-DD").diff(moment(today, "YYYY-MM-DD"), "days");

const entriesLabel = (n) => `${n} ${n === 1 ? "entry" : "entries"}`;

function PunchPassesByStudent({ studentId, studentName, onChange }) {
  const { activeTenant } = useActiveTenant();
  const isAdmin = activeTenant?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [passes, setPasses] = useState([]);
  const [passTypes, setPassTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [today, setToday] = useState(() => moment().format("YYYY-MM-DD"));

  // Dialog state: `true` opens a "new" form, an object opens it for edit.
  const [passForm, setPassForm] = useState(null);
  const [entryForm, setEntryForm] = useState(null);
  const [passToDelete, setPassToDelete] = useState(null);
  const [entryToUndo, setEntryToUndo] = useState(null);

  useEffect(() => {
    const init = async () => {
      const [timezone, types, classList, locationList] = await Promise.all([
        getTimezone(),
        getPassTypes(),
        getAllClasses(),
        getAllLocations(),
      ]);
      setToday(getTodayInTimezone(timezone));
      setPassTypes(types ?? []);
      setClasses(classList ?? []);
      setLocations(locationList ?? []);
      await loadPasses();
      setLoading(false);
    };
    init();
  }, [studentId]);

  const loadPasses = async () => {
    const data = await getPassesByStudent(studentId);
    setLoadError(!data);
    if (data) setPasses(data);
  };

  const notify = (text, severity = "success") => onChange?.({ text, severity });

  const handleSaved = async (text) => {
    setPassForm(null);
    setEntryForm(null);
    await loadPasses();
    notify(text);
  };

  const handleUndo = async () => {
    if (await deletePunch(entryToUndo.id)) {
      await loadPasses();
      notify("Entry removed. It's back on the pass.");
    } else {
      notify("Couldn't remove the entry. Check your connection and try again.", "error");
    }
  };

  const handleDeletePass = async () => {
    if (await deletePass(passToDelete.id)) {
      await loadPasses();
      notify("Pass deleted.");
    } else {
      notify("Couldn't delete the pass. Check your connection and try again.", "error");
    }
  };

  if (loading) return <Loading variant="table" />;

  const current = nextPassToUse(passes, today);
  const activePasses = passes.filter((p) => passStatus(p, today) === "active");
  const totalRemaining = activePasses.reduce((sum, p) => sum + entriesRemaining(p), 0);
  // Passes waiting their turn, in the order they'll be used (oldest first;
  // `passes` comes newest first).
  const queued = activePasses.filter((p) => p.id !== current?.id).reverse();
  const entries = passes
    .flatMap((pass) => (pass.entries ?? []).map((entry) => ({ ...entry, pass })))
    .sort((a, b) => b.used_at.localeCompare(a.used_at));

  // Most recently expired pass that still had entries, to offer an extension.
  const extendable = !current
    ? passes.find((p) => passStatus(p, today) === "expired")
    : null;
  const latest = passes[0];

  const renderStatusAlert = () => {
    if (passes.length === 0) return null;
    if (!current) {
      return (
        <Alert severity="warning">
          <p className="font-medium">
            {extendable
              ? `The pass expired on ${formatDate(extendable.expires_on)} with ${entriesLabel(entriesRemaining(extendable))} left.`
              : `The last pass (${latest.name}) is used up.`}
          </p>
          <p>New entries can&apos;t be recorded until a new pass is sold{extendable ? " or the expiry is extended" : ""}.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setPassForm(true)}>
              Sell new pass
            </Button>
            {extendable && (
              <Button size="sm" variant="outline" onClick={() => setPassForm(extendable)}>
                Extend expiry
              </Button>
            )}
          </div>
        </Alert>
      );
    }
    if (totalRemaining === 1) {
      return (
        <Alert severity="warning">
          <p>One entry left. Offer a new pass at the next class.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setPassForm(true)}>
            Sell new pass
          </Button>
        </Alert>
      );
    }
    if (current.expires_on && queued.length === 0) {
      const days = daysUntil(current.expires_on, today);
      if (days <= EXPIRY_WARNING_DAYS) {
        return (
          <Alert severity="warning">
            <p>
              Expires {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`} with{" "}
              {entriesLabel(entriesRemaining(current))} left.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPassForm(true)}>
                Sell new pass
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPassForm(current)}>
                Extend expiry
              </Button>
            </div>
          </Alert>
        );
      }
    }
    return null;
  };

  const statusAlert = renderStatusAlert();

  return (
    <div className="rounded-lg border border-brand-dark/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-brand-dark">Punch Pass</h2>
        {passes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPassForm(true)}>
              Sell pass
            </Button>
            <Button onClick={() => setEntryForm(true)} disabled={!current}>
              Record entry
            </Button>
          </div>
        )}
      </div>

      {loadError && (
        <Alert severity="error" className="mt-4">
          Couldn&apos;t load punch passes. Check your connection and refresh.
        </Alert>
      )}

      {!loadError && passes.length === 0 && (
        <EmptyState
          className="mt-4"
          icon={Ticket}
          title="No punch pass"
          description={`Sell ${studentName ?? "this student"} a pass to track each class they attend against it.`}
          action={<Button onClick={() => setPassForm(true)}>Sell pass</Button>}
        />
      )}

      {current && (
        <div className="mt-4">
          <p className="text-4xl font-bold tabular-nums text-brand-dark">
            {totalRemaining}
            <span className="ml-2 text-base font-normal text-brand-dark/60">
              {totalRemaining === 1 ? "entry left" : "entries left"}
            </span>
          </p>
          <p className="mt-1 text-sm text-brand-dark/70">
            Next entry uses <span className="font-medium text-brand-dark">{current.name}</span>:{" "}
            {entriesUsed(current)} of {current.total_entries} used
            {current.expires_on
              ? `, expires ${formatDate(current.expires_on)}`
              : ", no expiry"}
            .
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-brand-dark/10"
            role="progressbar"
            aria-label={`${current.name} entries used`}
            aria-valuemin={0}
            aria-valuemax={current.total_entries}
            aria-valuenow={entriesUsed(current)}
          >
            <div
              className="h-full rounded-full bg-brand-pink-deep"
              style={{ width: `${(entriesUsed(current) / current.total_entries) * 100}%` }}
            />
          </div>
          {queued.length > 0 && (
            <p className="mt-2 text-sm text-brand-dark/70">
              Up next, once {current.name} runs out:{" "}
              {queued
                .map((p) => `${p.name} (${entriesLabel(entriesRemaining(p))})`)
                .join(", then ")}
              .
            </p>
          )}
        </div>
      )}

      {statusAlert && <div className="mt-4">{statusAlert}</div>}

      {passes.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">Entry history</h3>
          {entries.length === 0 ? (
            <p className="text-sm text-brand-dark/60">No entries recorded yet.</p>
          ) : (
            <div className="rounded-lg border border-brand-dark/10 p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Pass</TableHead>
                    <TableHead>Recorded by</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(entry.used_at)}
                        <span className="block text-xs text-brand-dark/60">
                          {moment(entry.used_at).format("h:mm A")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entry.class ? `${entry.class.name} ${entry.class.level ?? ""}` : "—"}
                        {entry.location && (
                          <span className="block text-xs text-brand-dark/60">
                            {entry.location.name}
                          </span>
                        )}
                        {entry.notes && (
                          <span className="block text-xs text-brand-dark/60">{entry.notes}</span>
                        )}
                      </TableCell>
                      <TableCell>{entry.pass.name}</TableCell>
                      <TableCell>{entry.recorder?.full_name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <IconButton
                          aria-label="Correct entry"
                          onClick={() => setEntryForm(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          aria-label="Undo entry"
                          onClick={() => setEntryToUndo(entry)}
                        >
                          <Undo2 className="h-4 w-4" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">Passes</h3>
          <div className="rounded-lg border border-brand-dark/10 p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pass</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passes.map((pass) => {
                  const status = STATUS_CHIP[passStatus(pass, today)];
                  return (
                    <TableRow key={pass.id}>
                      <TableCell>
                        <span className="font-medium">{pass.name}</span>
                        <Chip label={status.label} tone={status.tone} className="ml-2" />
                        <span className="block text-xs text-brand-dark/60">
                          Bought {formatDate(pass.purchased_on)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entriesUsed(pass)} / {pass.total_entries}
                      </TableCell>
                      <TableCell>{pass.expires_on ? formatDate(pass.expires_on) : "Never"}</TableCell>
                      <TableCell>
                        {formatMoney(pass.price)}
                        {pass.payment_method && (
                          <span className="block text-xs text-brand-dark/60">
                            {pass.payment_method}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <IconButton
                          aria-label={`Edit ${pass.name}`}
                          onClick={() => setPassForm(pass)}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        {isAdmin && (
                          <IconButton
                            aria-label={`Delete ${pass.name}`}
                            onClick={() => setPassToDelete(pass)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <PunchPassForm
        open={!!passForm}
        onOpenChange={(open) => !open && setPassForm(null)}
        studentId={studentId}
        pass={passForm === true ? null : passForm}
        passTypes={passTypes}
        onSaved={handleSaved}
      />
      <PunchEntryForm
        open={!!entryForm}
        onOpenChange={(open) => !open && setEntryForm(null)}
        studentId={studentId}
        entry={entryForm === true ? null : entryForm}
        classes={classes}
        locations={locations}
        description={
          entryForm === true && current
            ? `Uses 1 of ${entriesLabel(totalRemaining)} left (from ${current.name}).`
            : null
        }
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={!!entryToUndo}
        onOpenChange={(open) => !open && setEntryToUndo(null)}
        title="Undo this entry?"
        description={
          entryToUndo &&
          `The ${formatDate(entryToUndo.used_at)} entry is removed and goes back on ${entryToUndo.pass.name}.`
        }
        confirmLabel="Undo entry"
        danger
        onConfirm={handleUndo}
      />
      <ConfirmDialog
        open={!!passToDelete}
        onOpenChange={(open) => !open && setPassToDelete(null)}
        title="Delete this pass?"
        description={
          passToDelete &&
          `${passToDelete.name} and its ${entriesLabel(entriesUsed(passToDelete))} are deleted, and its ${formatMoney(passToDelete.price)} no longer counts in revenue reports. Only do this for a pass sold by mistake.`
        }
        confirmLabel="Delete pass"
        danger
        onConfirm={handleDeletePass}
      />
    </div>
  );
}

export default PunchPassesByStudent;
