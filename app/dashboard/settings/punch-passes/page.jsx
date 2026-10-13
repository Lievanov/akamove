"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Ticket, Trash2 } from "lucide-react";
import {
  getPassTypes,
  savePassType,
  deletePassType,
} from "@/api/punch_pass/punch_pass";
import Loading from "@/app/components/Loading";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Toast } from "@/app/components/ui/Toast";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Checkbox } from "@/app/components/ui/Checkbox";
import TextInput from "@/app/components/ui/TextInput";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatMoney } from "@/app/components/utils/utils";
import SettingsTabs from "@/app/components/membership/SettingsTabs";

const EMPTY_TYPE = {
  name: "",
  total_entries: "",
  price: "",
  validity_days: "",
  is_active: true,
};

function PassTypeDialog({ passType, onOpenChange, onSaved }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: EMPTY_TYPE });
  const [error, setError] = useState("");

  useEffect(() => {
    if (passType) {
      reset({
        ...EMPTY_TYPE,
        ...passType,
        validity_days: passType.validity_days ?? "",
      });
      setError("");
    }
  }, [passType]);

  const onSubmit = async (data) => {
    const ok = await savePassType({
      id: passType?.id,
      name: data.name,
      total_entries: Number(data.total_entries),
      price: Number(data.price),
      validity_days: data.validity_days ? Number(data.validity_days) : null,
      is_active: data.is_active,
    });
    if (ok) {
      onSaved(passType?.id ? "Pass type updated." : "Pass type added.");
    } else {
      setError("Couldn't save the pass type. Check your connection and try again.");
    }
  };

  return (
    <Dialog open={!!passType} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{passType?.id ? "Edit pass type" : "New pass type"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextInput
            property="name"
            label="Name"
            placeholder="10-class pass"
            errors={errors}
            control={control}
            required="Name is required"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              property="total_entries"
              label="Entries"
              type="number"
              step="1"
              min="1"
              errors={errors}
              control={control}
              required="Entries are required"
              rules={{
                validate: (v) =>
                  (Number.isInteger(Number(v)) && Number(v) > 0) ||
                  "Use a whole number above 0",
              }}
            />
            <TextInput
              property="price"
              label="Price"
              type="number"
              step="0.01"
              min="0"
              prefix="$"
              errors={errors}
              control={control}
              required="Price is required"
              rules={{ validate: (v) => Number(v) >= 0 || "Price can't be negative" }}
            />
          </div>
          <TextInput
            property="validity_days"
            label="Valid for (days)"
            placeholder="Leave empty for no expiry"
            type="number"
            step="1"
            min="1"
            errors={errors}
            control={control}
            rules={{
              validate: (v) =>
                v === "" ||
                v === null ||
                (Number.isInteger(Number(v)) && Number(v) > 0) ||
                "Use a whole number of days, or leave it empty",
            }}
          />
          <Checkbox
            property="is_active"
            label="Offer this pass when selling"
            control={control}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogActions>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PunchPassSettings() {
  const [loading, setLoading] = useState(true);
  const [passTypes, setPassTypes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [alert, setAlert] = useState({ text: "", severity: "" });

  useEffect(() => {
    loadPassTypes();
  }, []);

  const loadPassTypes = async () => {
    const types = await getPassTypes();
    if (types) setPassTypes(types);
    else
      setAlert({
        text: "Couldn't load pass types. Check your connection and refresh.",
        severity: "error",
      });
    setLoading(false);
  };

  const handleSaved = (text) => {
    setEditing(null);
    setAlert({ text, severity: "success" });
    loadPassTypes();
  };

  const handleDelete = async () => {
    if (await deletePassType(toDelete.id)) {
      setAlert({ text: "Pass type deleted.", severity: "success" });
      loadPassTypes();
    } else {
      setAlert({
        text: "Couldn't delete the pass type. Check your connection and try again.",
        severity: "error",
      });
    }
  };

  if (loading) return <Loading variant="form-page" />;

  return (
    <>
      {alert.text && (
        <Toast
          text={alert.text}
          severity={alert.severity}
          duration={5000}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      <PageHeader title="Settings" />
      <SettingsTabs />
      <div className="mx-auto max-w-3xl px-4 pb-8">
        <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:my-10 md:p-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-semibold text-brand-dark">
                Punch Pass Types
              </h2>
              <p className="text-sm text-brand-dark/60">
                The passes you sell, like 5 or 10 classes for a set price. Each
                class a student attends uses one entry. Changing a type
                doesn&apos;t change passes already sold.
              </p>
            </div>
            {passTypes.length > 0 && (
              <Button className="shrink-0" onClick={() => setEditing(EMPTY_TYPE)}>
                Add pass type
              </Button>
            )}
          </div>

          {passTypes.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No pass types yet"
              description="Add the passes you sell so staff can pick one from a student's page. You can still sell a custom pass without one."
              action={
                <Button onClick={() => setEditing(EMPTY_TYPE)}>Add pass type</Button>
              }
            />
          ) : (
            <div className="rounded-lg border border-brand-dark/10 p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Valid for</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <span className="font-medium">{type.name}</span>
                        {!type.is_active && (
                          <Chip label="Hidden" tone="neutral" className="ml-2" />
                        )}
                      </TableCell>
                      <TableCell>{type.total_entries}</TableCell>
                      <TableCell>{formatMoney(type.price)}</TableCell>
                      <TableCell>
                        {type.validity_days ? `${type.validity_days} days` : "No expiry"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <IconButton
                          aria-label={`Edit ${type.name}`}
                          onClick={() => setEditing(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          aria-label={`Delete ${type.name}`}
                          onClick={() => setToDelete(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <PassTypeDialog
        passType={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this pass type?"
        description={
          toDelete &&
          `"${toDelete.name}" won't be offered when selling. Passes already sold keep working. To stop offering it without deleting, edit it and untick "Offer this pass".`
        }
        confirmLabel="Delete pass type"
        danger
        onConfirm={handleDelete}
      />
    </>
  );
}

export default PunchPassSettings;
