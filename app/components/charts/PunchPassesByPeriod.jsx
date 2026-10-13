import { useEffect, useState } from "react";
import { getPassSalesInRange } from "@/api/punch_pass/punch_pass";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatDate, formatMoney } from "@/app/components/utils/utils";

const PunchPassesByPeriod = ({ startDate, endDate }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    getPassSalesInRange(startDate, endDate).then(setData);
  }, [startDate, endDate]);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-brand-dark">
        Punch Passes Sold This Period
      </h3>
      <div className="rounded-lg border border-brand-dark/10 bg-white p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Pass</TableHead>
              <TableHead>Date Purchased</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.student?.first_name} {item.student?.last_name}
                </TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{formatDate(item.purchased_on)}</TableCell>
                <TableCell>{item.payment_method ?? "—"}</TableCell>
                <TableCell>{formatMoney(item.price)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-brand-dark/5 font-bold">
              <TableCell colSpan={4}>Total:</TableCell>
              <TableCell>
                {formatMoney(
                  data.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default PunchPassesByPeriod;
