"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { Pencil } from "lucide-react";
import {
  getStudentsBylastPayment,
  getStudentCountFiltered,
} from "@/api/student/students";
import Loading from "@/app/components/Loading";
import { Toast } from "@/app/components/ui/Toast";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { Input } from "@/app/components/ui/Input";
import { Pagination } from "@/app/components/ui/Pagination";
import { ClassChips } from "@/app/components/ui/ClassChips";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatPhoneNumber } from "@/app/components/utils/utils";

function Students() {
  const ITEMS_PER_PAGE = 10;

  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState({ text: "", severity: "" });

  const retrieveStudentList = async (value) => {
    setStudents([]);
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const studentData = await getStudentsBylastPayment(
      start,
      end,
      value ? value : ""
    );
    setStudents(studentData);
    const count = await getStudentCountFiltered(value ? value : "");
    setTotalItems(count);
    setLoading(false);
  };

  const debouncedSearch = useRef(
    debounce(async (value) => {
      retrieveStudentList(value);
    }, 500)
  ).current;

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const text = urlSearchParams.get("text");
    const severity = urlSearchParams.get("severity");
    const pageParam = urlSearchParams.get("page");
    const searchParam = urlSearchParams.get("search");

    if (text && severity) setAlert({ text, severity });

    // Initialize search term from query params if present
    if (searchParam) {
      setSearchTerm(searchParam);
    }

    // Initialize page from query params if present
    if (pageParam) {
      const pageNumber = parseInt(pageParam, 10);
      if (pageNumber > 0) {
        setPage(pageNumber);
        // Trigger data fetch for the specified page
        retrieveStudentList(searchParam || "");
      }
    } else {
      // If no page param, load initial data
      retrieveStudentList(searchParam || "");
    }
  }, []);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    retrieveStudentList(searchTerm);
  }, [page]);

  const handleChange = (event) => {
    const { value } = event.target;

    // Update query string with search term immediately using the current input value
    const url = new URL(window.location.href);
    if (value.trim() === "") {
      // Remove search parameter if empty
      url.searchParams.delete("search");
    } else {
      // Add search parameter
      url.searchParams.set("search", value);
    }

    // Always reset to page 1 when searching
    url.searchParams.delete("page");

    // Update URL without page reload
    router.push(url.pathname + url.search, { scroll: false });

    // Update state and trigger search
    setSearchTerm(value);
    handlePagination(1);
  };

  const handlePagination = (value) => {
    setPage(value);

    // Update query string for pages 2 and above, preserving search term
    const url = new URL(window.location.href);

    // Preserve search term if present
    if (searchTerm.trim() !== "") {
      url.searchParams.set("search", searchTerm);
    }

    if (value === 1) {
      // Remove page parameter for page 1
      url.searchParams.delete("page");
    } else {
      // Add page parameter for pages 2+
      url.searchParams.set("page", value.toString());
    }

    // Update URL without page reload
    router.push(url.pathname + url.search, { scroll: false });
  };

  const getUniqueClassesForRow = (row) => {
    const classNames = Array.isArray(row?.class_info) ? row.class_info : row?.class_info;
    const classTypes = Array.isArray(row?.class_type) ? row.class_type : row?.class_type;

    if (!Array.isArray(classNames) || !Array.isArray(classTypes)) {
      return { class_info: row?.class_info, class_type: row?.class_type };
    }
    if (classNames.length !== classTypes.length) {
      return { class_info: row?.class_info, class_type: row?.class_type };
    }

    const seen = new Set();
    const uniqueNames = [];
    const uniqueTypes = [];

    for (let i = 0; i < classNames.length; i += 1) {
      const name = classNames[i];
      const type = classTypes[i];
      if (!name) continue;
      const key = String(name).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueNames.push(name);
      uniqueTypes.push(type);
    }

    return { class_info: uniqueNames, class_type: uniqueTypes };
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Students" />
      <div className="mx-auto mb-8 max-w-5xl px-4">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="my-6">
          <div className="flex justify-between pb-1">
            <Button onClick={() => router.push("/dashboard/students/new")}>
              Add new student
            </Button>
          </div>
          <p className="text-sm text-brand-dark/70">
            Total Students: {totalItems}
          </p>
        </div>
        <div className="rounded-lg border border-brand-dark/10 p-2">
          <div className="mb-4">
            <Input
              id="searchTerm"
              placeholder="Search by Name or Phone Number"
              value={searchTerm}
              onChange={handleChange}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Current Classes</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((row) => {
                const unique = getUniqueClassesForRow(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium text-brand-pink hover:underline"
                        onClick={() =>
                          router.push(`/dashboard/students/${row.id}`)
                        }
                      >
                        {row.first_name}
                      </button>
                    </TableCell>
                    <TableCell>{row.last_name}</TableCell>
                    <TableCell>{formatPhoneNumber(row.phone)}</TableCell>
                    <TableCell>
                      <ClassChips
                        colorIds={unique.class_type}
                        classes={unique.class_info}
                        router={router}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(`/dashboard/payments/${row.id}`)
                        }
                      >
                        Payment
                      </Button>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        aria-label="Edit student"
                        onClick={() =>
                          router.push(`/dashboard/students/${row.id}/edit`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Pagination
              page={page}
              totalItems={totalItems}
              pageSize={ITEMS_PER_PAGE}
              onChange={handlePagination}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export { Students };
export default function StudentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Students />
    </Suspense>
  );
}
