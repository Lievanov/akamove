"use client";
import { useState, useEffect } from "react";
import { studentCountByPeriod } from "@/api/period/period";
import Loading from "../Loading";

function StudentCountByPeriod({ periodId }) {
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(null);

  useEffect(() => {
    fetchStudentCount();
  }, [periodId]);

  const fetchStudentCount = async () => {
    const data = await studentCountByPeriod(periodId);
    setStudentCount(data[0]?.student_count);
    setLoading(false);
  };

  if (loading) return <Loading variant="block" />;

  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-dark">
        Students subscribed to this period
      </h3>
      <p className="mt-1 text-4xl font-bold text-brand-dark">
        {studentCount !== null ? studentCount : "No data available"}
      </p>
    </div>
  );
}

export default StudentCountByPeriod;
