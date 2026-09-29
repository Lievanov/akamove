"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/app/components/ui/Toast";
import Loading from "@/app/components/Loading";
import { getClassTypeList } from "@/api/class/class_type";
import ClassByType from "@/app/components/form/ClassByType";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";
import ClassTypeForm from "@/app/components/form/ClassTypeForm";
import { updateAllClassesByClassType } from "@/api/class/class";

function UpdateClass() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classList, setClassList] = useState({});
  const [classTypeList, setClassTypeList] = useState([]);
  const [classType, setClassType] = useState("");
  const [alert, setAlert] = useState({ text: "", severity: "" });

  useEffect(() => {
    fetchClassTypeList();
  }, []);

  const fetchClassTypeList = async () => {
    try {
      const list = await getClassTypeList();
      setClassTypeList(list);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getClassListFromDnD = (classes) => {
    setClassList(classes);
  };

  const onSubmit = async () => {
    const newClassList = classList.map((c, i) => {
      return { ...c, order: i + 1 };
    });
    const res = await updateAllClassesByClassType(newClassList);
    if (res) {
      setAlert({ text: "Classes saved successfully", severity: "success" });
    } else {
      setAlert({ text: "Error saving classes", severity: "error" });
    }
  };

  const saveNewClass = async (res) => {
    await fetchClassTypeList();
    if (res) {
      setAlert({ text: "Class type saved successfully", severity: "success" });
    } else {
      setAlert({ text: "Error saving class type", severity: "error" });
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Update Classes" />
      <div className="mx-auto max-w-2xl px-4 pb-8">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="my-6 rounded-lg border border-brand-dark/10 p-6 md:my-10 md:p-8">
          <h1 className="text-center text-2xl font-semibold text-brand-dark">
            Update Classes
          </h1>
          <div className="mt-4 flex justify-between">
            {classType ? (
              <Button onClick={() => onSubmit()}>Save</Button>
            ) : (
              <div />
            )}
            <Button variant="outline" onClick={() => router.push("/dashboard/classes")}>
              Return
            </Button>
          </div>
          <ClassTypeForm onSubmit={(res) => saveNewClass(res)} />
          <div className="mt-6">
            <Select
              label="Select a class"
              value={classType}
              onChange={setClassType}
              placeholder="Select..."
              options={classTypeList.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </div>

          {classType && (
            <div className="mt-6">
              <ClassByType
                classType={classType}
                getClassListFromDnD={getClassListFromDnD}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default UpdateClass;
