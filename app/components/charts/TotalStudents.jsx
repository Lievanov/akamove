"use client";

import { useState, useEffect } from "react";
import { getStudentCount } from "@/api/student/students";

function TotalStudents() {
  const [studentCount, setstudentCount] = useState(0);

  const getGraphInfo = async () => {
    setstudentCount(await getStudentCount());
  };
  useEffect(() => {
    getGraphInfo();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-dark">Total Student Count</h2>
      <p className="mt-1 text-4xl font-bold text-brand-dark">{studentCount}</p>
    </div>
  );
}

export default TotalStudents;
