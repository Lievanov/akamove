import { useEffect, useRef, useState } from "react";

import { rowLinkClass } from "@/app/components/ui/ServerTableCard";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getClassesByStudent,
  getClassesByStudentCount,
} from "@/api/class/class";
import { getPaymentAmountsForStudentsInPeriod } from "@/api/payment/payment";
import { debounce } from "lodash";
import Loading from "@/app/components/Loading";
import { ClassChips } from "@/app/components/ui/ClassChips";
import { Input } from "@/app/components/ui/Input";
import { Pagination } from "@/app/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { getLatestPeriod, getPeriodById } from "@/api/period/period";
import { formatMoney } from "@/app/components/utils/utils";

function ClassesByStudentList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParam = searchParams.get("searchParam");
  const periodId = searchParams.get("periodId");

  const ITEMS_PER_PAGE = 10;

  const [classes, setClasses] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPeriod, setSearchPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const currentPeriodIdRef = useRef(periodId || null);

  const debouncedSearch = useRef(
    debounce(async (value, periodValue) => {
      retrieveClassByStudentList(value, periodValue);
    }, 500)
  ).current;

  useEffect(() => {
    retrieveClassByStudentList(searchTerm, searchPeriod);
  }, [page]);

  const handleChange = (event) => {
    const { value } = event.target;
    setSearchTerm(value);
    handlePagination(1);
  };

  const handlePeriodChange = (event) => {
    const { value } = event.target;
    setSearchPeriod(value);
    handlePagination(1);
  };

  useEffect(() => {
    debouncedSearch(searchTerm, searchPeriod);
  }, [searchTerm, searchPeriod]);

  useEffect(() => {
    if (searchParam) {
      setSearchTerm(searchParam);
      debouncedSearch(searchParam);
    }
  }, [searchParam]);

  useEffect(() => {
    if (periodId) {
      debouncedSearch(searchTerm, retrievePeriodById(periodId));
    } else {
      debouncedSearch(searchTerm, retrieveCurrentPeriod());
    }
  }, []);

  const retrievePeriodById = async (id) => {
    const period = await getPeriodById(id);
    if (!period) return;
    currentPeriodIdRef.current = period.id;
    setSearchPeriod(period.name);
  };

  const retrieveCurrentPeriod = async () => {
    const period = await getLatestPeriod();
    // A new studio has no periods yet.
    if (!period) return;
    currentPeriodIdRef.current = period.id;
    setSearchPeriod(period.name);
  };

  const retrieveClassByStudentList = async (value, periodValue) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const classesData = await getClassesByStudent(
      start,
      end,
      value ? value : "",
      periodValue ? periodValue : ""
    );
    setClasses(classesData);
    const count = await getClassesByStudentCount(value ? value : "", periodValue ? periodValue : "");
    setTotalItems(count);

    if (classesData?.length > 0 && currentPeriodIdRef.current) {
      const studentIds = [...new Set(classesData.map((row) => row.id))];
      const amounts = await getPaymentAmountsForStudentsInPeriod(studentIds, currentPeriodIdRef.current);
      setPaymentAmounts(amounts);
    }

    setLoading(false);
  };

  const handlePagination = (value) => {
    setPage(value);
  };

  if (loading) return <Loading variant="table" />;

  return (
    <div className="rounded-lg border border-brand-dark/10 bg-white p-2">
      <div className="mb-2 grid grid-cols-1 gap-3 p-2 md:grid-cols-12">
        <div className="md:col-span-8">
          <label htmlFor="searchTerm" className="sr-only">
            Search classes and students
          </label>
          <Input
            id="searchTerm"
            type="search"
            placeholder="Search by class, student last name or phone number"
            value={searchTerm}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-4">
          <label htmlFor="searchPeriod" className="sr-only">
            Period
          </label>
          <Input
            id="searchPeriod"
            type="search"
            placeholder="Period"
            value={searchPeriod}
            onChange={handlePeriodChange}
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Amount paid</TableHead>
            <TableHead className="hidden md:table-cell">Period</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((row, i) => (
            <TableRow key={`${row.id} + ${i}`}>
              <TableCell>
                <ClassChips
                  colorIds={[row.class_type]}
                  classes={[row.class_info]}
                  router={router}
                  periodId={periodId}
                  openInNewTab
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/students/${row.id}`}
                  className={rowLinkClass}
                >
                  {[row.first_name, row.last_name].filter(Boolean).join(" ")}
                </Link>
              </TableCell>
              <TableCell className="hidden text-right sm:table-cell">
                {formatMoney(paymentAmounts[`${row.id}_${row.class_id}`])}
              </TableCell>
              <TableCell className="hidden md:table-cell">{row.period_name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {classes?.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-dark/60">
          {searchTerm
            ? "No students match your search."
            : "No students are enrolled in classes for this period yet. They show up here once they pay for classes."}
        </p>
      )}
      <div className="mt-4">
        <Pagination
          page={page}
          totalItems={totalItems}
          pageSize={ITEMS_PER_PAGE}
          onChange={handlePagination}
        />
      </div>
    </div>
  );
}

export default ClassesByStudentList;
