import { useEffect, useState } from "react";
import { getEventPaymentsInRange } from "@/api/events/event_payment";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";
import { formatMoney } from "@/app/components/utils/utils";

const EventsByPeriod = ({ startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getEventPaymentsInRange(startDate, endDate);
        setData(result);
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-brand-dark">
        Event Payments This Period
      </h3>
      <div className="rounded-lg border border-brand-dark/10 bg-white p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.event?.event_name}</TableCell>
                <TableCell>{item.client_name}</TableCell>
                <TableCell>{item.payment_date}</TableCell>
                <TableCell>{formatMoney(item.payment_amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-brand-dark/5 font-bold">
              <TableCell colSpan={3}>Total:</TableCell>
              <TableCell>
                {formatMoney(data.reduce((sum, item) => sum + (item.payment_amount || 0), 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EventsByPeriod;
