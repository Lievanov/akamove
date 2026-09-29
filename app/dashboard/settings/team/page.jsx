"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { getUserRoleForTenant } from "@/api/tenant/tenant";
import { getInvites, createInvite, revokeInvite } from "@/api/tenant/invite";
import { getUser } from "@/lib/supabase/client";
import { useActiveTenant } from "@/app/context/TenantContext";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
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

const STATUS_STYLE = {
  pending: "bg-amber-500",
  accepted: "bg-green-600",
  revoked: "bg-brand-dark/40",
};

function Team() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invites, setInvites] = useState([]);
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const { activeTenant, tenantsLoading } = useActiveTenant();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { role: "staff" } });

  useEffect(() => {
    let isActive = true;
    const checkAccess = async () => {
      const user = await getUser();
      if (!user?.id) {
        router.replace("/");
        return;
      }

      if (tenantsLoading) return;

      const role = await getUserRoleForTenant(user.id, activeTenant?.id);
      if (role !== "admin") {
        router.replace("/dashboard/access-denined");
        return;
      }

      if (isActive) setCheckingAccess(false);
    };

    checkAccess();

    return () => {
      isActive = false;
    };
  }, [router, activeTenant?.id, tenantsLoading]);

  useEffect(() => {
    if (checkingAccess) return;
    loadInvites();
  }, [checkingAccess]);

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

  const handleRevoke = async (inviteId) => {
    const success = await revokeInvite(inviteId);
    if (success) loadInvites();
  };

  if (checkingAccess || loading) return <Loading />;

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
      <PageHeader title="Team" />
      <div className="mx-auto max-w-3xl px-4 pb-8">
        <div className="my-6 rounded-lg border border-brand-dark/10 p-6 md:p-8">
          <BackButton routeTo="/dashboard/settings" />
          <h1 className="mt-4 text-2xl font-semibold text-brand-dark">
            Invite a teammate
          </h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            No email is sent — invites are matched automatically the next
            time that address logs in with Google. Tell them directly to do
            so.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <TextInput
                property="email"
                label="Email*"
                errors={errors}
                control={control}
                required="Email is required"
                placeholder="teammate@example.com"
              />
              <div className="w-full sm:w-40">
                <Select
                  property="role"
                  label="Role*"
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
            <p className="text-sm text-brand-dark/60">No invites yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revoke</TableHead>
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
                        className={STATUS_STYLE[invite.status]}
                      />
                    </TableCell>
                    <TableCell>
                      {invite.status === "pending" && (
                        <IconButton
                          aria-label="Revoke invite"
                          onClick={() => handleRevoke(invite.id)}
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
    </>
  );
}

export default Team;
