import { useEffect, useRef, useState } from "react";

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
    currentPeriodIdRef.current = period.id;
    setSearchPeriod(period.name);
  };

  const retrieveCurrentPeriod = async () => {
    const period = await getLatestPeriod();
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

  if (loading) return <Loading />;

  return (
    <div className="rounded-lg border border-brand-dark/10 p-2">
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-8">
          <Input
            id="searchTerm"
            placeholder="Search by Class Name, Student Last Name, or Phone Number"
            value={searchTerm}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-4">
          <Input
            id="searchPeriod"
            placeholder="Search by Period"
            value={searchPeriod}
            onChange={handlePeriodChange}
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Student First Name</TableHead>
            <TableHead>Student Last Name</TableHead>
            <TableHead>Amount Paid</TableHead>
            <TableHead>Period</TableHead>
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
                <button
                  type="button"
                  className="font-medium text-brand-pink hover:underline"
                  onClick={() => router.push(`/dashboard/students/${row.id}`)}
                >
                  {row.first_name}
                </button>
              </TableCell>
              <TableCell>{row.last_name}</TableCell>
              <TableCell>
                {paymentAmounts[`${row.id}_${row.class_id}`] != null
                  ? `$${paymentAmounts[`${row.id}_${row.class_id}`].toFixed(2)}`
                  : "—"}
              </TableCell>
              <TableCell>{row.period_name}</TableCell>
            </TableRow>
          ))}
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
  );
}

export default ClassesByStudentList;
