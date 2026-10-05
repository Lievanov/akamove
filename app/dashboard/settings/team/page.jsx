"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { getInvites, createInvite, revokeInvite } from "@/api/tenant/invite";
import { useActiveTenant } from "@/app/context/TenantContext";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
import { Alert } from "@/app/components/ui/Alert";
import Link from "next/link";
import TextInput from "@/app/components/ui/TextInput";
import { Select } from "@/app/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

const STATUS_TONE = {
  pending: "warning",
  accepted: "success",
  revoked: "neutral",
};

function Team() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invites, setInvites] = useState([]);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const [inviteToRevoke, setInviteToRevoke] = useState(null);
  const { activeTenant } = useActiveTenant();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { role: "staff" } });

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setInvites(await getInvites(activeTenant?.id));
    setLoading(false);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    const success = await createInvite(activeTenant?.id, data.email, data.role);
    setSubmitting(false);

    if (!success) {
      setAlert({
        text: "Failed to create invite — check they don't already have a pending invite.",
        severity: "error",
      });
      return;
    }

    setAlert({
      text: `Invite created. No email is sent — let ${data.email} know to log in to aka Move with that address.`,
      severity: "success",
    });
    reset({ email: "", role: "staff" });
    loadInvites();
  };

  const handleRevoke = async () => {
    const success = await revokeInvite(inviteToRevoke.id);
    if (success) {
      setAlert({ text: `Invite for ${inviteToRevoke.email} revoked.`, severity: "success" });
      loadInvites();
    } else {
      setAlert({ text: "Couldn't revoke the invite. Check your connection and try again.", severity: "error" });
    }
  };

  const header = (
    <PageHeader
      title="Team"
      breadcrumbs={[{ label: "Settings", href: "/dashboard/settings" }]}
    />
  );

  if (loading)
    return (
      <>
        {header}
        <div className="px-4 py-6">
          <Loading variant="form" />
        </div>
      </>
    );

  return (
    <>
      {alert.text && (
        <Toast
          text={alert.text}
          severity={alert.severity}
          duration={6000}
          onExited={() => setAlert({ text: "", severity: "" })}
        />
      )}
      {header}
      <div className="mx-auto max-w-3xl px-4 pb-8">
        <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:p-8">
          <h2 className="text-xl font-semibold text-brand-dark">
            Invite a teammate
          </h2>
          <p className="mt-1 text-sm text-brand-dark/60">
            No email is sent — invites are matched automatically the next
            time that address logs in with Google. Tell them directly to do
            so.
          </p>
          {activeTenant?.plan === "starter" && (
            <Alert severity="warning" className="mt-4">
              Your studio is on Starter, which only includes admin accounts.
              Staff you invite will see a message asking them to contact you
              until you move to Studio or higher.{" "}
              <Link
                href="/dashboard/settings/membership"
                className="font-semibold underline"
              >
                See plans
              </Link>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <TextInput
                property="email"
                label="Email"
                errors={errors}
                control={control}
                required="Email is required"
                placeholder="teammate@example.com"
              />
              <div className="w-full sm:w-40">
                <Select
                  property="role"
                  label="Role"
                  errors={errors}
                  control={control}
                  required="Role is required"
                  options={ROLE_OPTIONS}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Inviting…" : "Invite"}
              </Button>
            </div>
          </form>

          <hr className="my-6 border-brand-dark/10" />

          <h2 className="mb-3 text-lg font-semibold text-brand-dark">
            Invites
          </h2>
          {invites.length === 0 ? (
            <p className="text-sm text-brand-dark/60">
              No invites yet. Invite someone above and they&apos;ll show up here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell className="capitalize">{invite.role}</TableCell>
                    <TableCell>
                      <Chip
                        label={invite.status}
                        tone={STATUS_TONE[invite.status]}
                        className="capitalize"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {invite.status === "pending" && (
                        <IconButton
                          aria-label={`Revoke invite for ${invite.email}`}
                          onClick={() => setInviteToRevoke(invite)}
                        >
                          <X className="h-4 w-4" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={!!inviteToRevoke}
        onOpenChange={(open) => !open && setInviteToRevoke(null)}
        title="Revoke this invite?"
        description={
          inviteToRevoke &&
          `${inviteToRevoke.email} won't be added to the studio when they log in. You can invite them again later.`
        }
        confirmLabel="Revoke invite"
        danger
        onConfirm={handleRevoke}
      />
    </>
  );
}

export default Team;
