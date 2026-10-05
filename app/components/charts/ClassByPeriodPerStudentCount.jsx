import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import { classByPeriodWithCorrectRevenue } from "@/api/period/period";
import { ClassChips } from "@/app/components/ui/ClassChips";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatMoney } from "@/app/components/utils/utils";

function SortableHead({ label, property, orderBy, order, onSort }) {
  const active = orderBy === property;
  return (
    <TableHead
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(property)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-dark/60 hover:text-brand-dark rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
      >
        {label}
        {active &&
          (order === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </TableHead>
  );
}

const ClassByPeriodPerStudentCount = ({ periodId }) => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [orderBy, setOrderBy] = useState("student_count");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await classByPeriodWithCorrectRevenue(periodId);
        setData(result);
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      }
    };

    fetchData();
  }, [periodId]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (orderBy === "class_info") {
        return order === "asc"
          ? a.class_info.localeCompare(b.class_info)
          : b.class_info.localeCompare(a.class_info);
      }
      if (orderBy === "student_count") {
        return order === "asc"
          ? a.student_count - b.student_count
          : b.student_count - a.student_count;
      }
      if (orderBy === "total_payment") {
        return order === "asc"
          ? a.total_payment - b.total_payment
          : b.total_payment - a.total_payment;
      }
      return 0;
    });
  }, [data, order, orderBy]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-brand-dark">
        Class By Period Per Student Count
      </h3>
      <div className="rounded-lg border border-brand-dark/10 bg-white p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Class Name" property="class_info" orderBy={orderBy} order={order} onSort={handleRequestSort} />
              <SortableHead label="Student Count" property="student_count" orderBy={orderBy} order={order} onSort={handleRequestSort} />
              <SortableHead label="Revenue" property="total_payment" orderBy={orderBy} order={order} onSort={handleRequestSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <ClassChips
                    colorIds={[item.class_type]}
                    classes={[item.class_info]}
                    router={router}
                    periodId={periodId}
                  />
                </TableCell>
                <TableCell>{item.student_count}</TableCell>
                <TableCell>{formatMoney(item.total_payment)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-brand-dark/5 font-bold">
              <TableCell>Total:</TableCell>
              <TableCell>
                {sortedData.reduce((sum, item) => sum + item.student_count, 0)}
              </TableCell>
              <TableCell>
                {formatMoney(sortedData.reduce((sum, item) => sum + item.total_payment, 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ClassByPeriodPerStudentCount;
