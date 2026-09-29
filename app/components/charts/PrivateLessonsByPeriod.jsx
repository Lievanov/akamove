import { useEffect, useState } from "react";
import { getPrivateLessonsInRange } from "@/api/private_lesson/private_lesson";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/app/components/ui/Table";

const PrivateLessonsByPeriod = ({ startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getPrivateLessonsInRange(startDate, endDate);
        setData(result);
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-brand-dark">
        Private Lessons Purchased This Period
      </h3>
      <div className="rounded-lg border border-brand-dark/10 p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Date Purchased</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.first_name} {item.last_name}
                </TableCell>
                <TableCell>{item.instructor_name}</TableCell>
                <TableCell>{item.date_purchased}</TableCell>
                <TableCell>{item.lessons_purchased}</TableCell>
                <TableCell>$ {item.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-brand-dark/5 font-bold">
              <TableCell colSpan={4}>Total:</TableCell>
              <TableCell>
                $ {data.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PrivateLessonsByPeriod;
