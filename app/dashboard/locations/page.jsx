"use client";
import { Suspense } from "react";
import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";
import { getLocations, getLocationCount } from "@/api/location/location";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";
import { buttonVariants } from "@/app/components/ui/Button";
import { iconButtonClass } from "@/app/components/ui/IconButton";
import { Chip } from "@/app/components/ui/Chip";
import { EmptyState } from "@/app/components/ui/EmptyState";
import {
  ServerTableCard,
  rowLinkClass,
} from "@/app/components/ui/ServerTableCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatPhoneNumber } from "@/app/components/utils/utils";
import { useServerTable } from "@/app/components/utils/useServerTable";
import { useFlashAlert } from "@/app/components/utils/useFlashAlert";

const fetchLocations = async ({ from, to }) => {
  const [rows, count] = await Promise.all([
    getLocations(from, to),
    getLocationCount(),
  ]);
  return { rows, count };
};

function Locations() {
  const [alert, setAlert] = useFlashAlert();
  const table = useServerTable({ fetchPage: fetchLocations });
  usePageTour(TOURS.locations, { ready: !table.isLoading });

  const addLocationButton = (
    <Link
      href="/dashboard/locations/new"
      data-tour="locations-add"
      className={buttonVariants()}
    >
      Add location
    </Link>
  );

  return (
    <>
      <PageHeader title="Locations" actions={addLocationButton} />
      <div className="mx-auto mb-8 max-w-5xl px-4 pt-6">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        {table.isLoading ? (
          <Loading variant="table" />
        ) : table.isEmpty ? (
          <EmptyState
            icon={MapPin}
            title="No locations yet"
            description="Add the studio space(s) where you teach. You need at least one location before you can build a period's class schedule."
            action={addLocationButton}
          />
        ) : (
          <div data-tour="locations-table">
            <ServerTableCard table={table} noun={["location", "locations"]}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Address</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/locations/${row.id}`}
                          className={rowLinkClass}
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{row.address || "—"}</TableCell>
                      <TableCell className="hidden whitespace-nowrap sm:table-cell">
                        {formatPhoneNumber(row.phone) || "—"}
                      </TableCell>
                      <TableCell className="hidden text-right lg:table-cell">
                        {row.capacity ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.is_active ? "Active" : "Inactive"}
                          tone={row.is_active ? "success" : "neutral"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/locations/${row.id}`}
                          aria-label={`Update ${row.name}`}
                          className={iconButtonClass}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ServerTableCard>
          </div>
        )}
      </div>
    </>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Locations />
    </Suspense>
  );
}
