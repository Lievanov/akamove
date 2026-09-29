import { useEffect, useState } from "react";
import { getActiveVsNonActiveStudents } from "@/api/charts/students";
import Loading from "../Loading";

const ActiveInactiveStudents = () => {
  const [data, setData] = useState({
    active_students: 0,
    non_active_students: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChartInfo();
  }, []);

  const getChartInfo = async () => {
    const data = await getActiveVsNonActiveStudents();
    if (data) {
      const activeStudentsVsNonActiveStudents = {
        active_students: data[0].active_students,
        non_active_students: data[0].total_students - data[0].active_students,
      };

      setData(activeStudentsVsNonActiveStudents);

      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const total = data.active_students + data.non_active_students;
  const activePct = total > 0 ? (data.active_students / total) * 100 : 0;
  const inactivePct = 100 - activePct;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-brand-dark/10">
        {activePct > 0 && (
          <div
            className="h-full bg-brand-pink"
            style={{ width: `${activePct}%` }}
          />
        )}
        {inactivePct > 0 && (
          <div
            className="h-full bg-brand-dark/30"
            style={{ width: `${inactivePct}%` }}
          />
        )}
      </div>
      <div className="mt-3 flex gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-pink" />
          Active <span className="font-semibold text-brand-dark">{data.active_students}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-dark/30" />
          Non-active <span className="font-semibold text-brand-dark">{data.non_active_students}</span>
        </span>
      </div>
    </div>
  );
};

export default ActiveInactiveStudents;
