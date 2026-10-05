"use client";
import { useState, useEffect } from "react";
import { Toast } from "@/app/components/ui/Toast";
import Loading from "@/app/components/Loading";
import { getClassTypeList } from "@/api/class/class_type";
import ClassByType from "@/app/components/form/ClassByType";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";
import ClassTypeForm from "@/app/components/form/ClassTypeForm";
import { deleteClassById, updateAllClassesByClassType } from "@/api/class/class";
import { Alert } from "@/app/components/ui/Alert";
import { useOnboarding, usePageTour } from "@/app/context/OnboardingContext";
import { TOURS } from "@/app/components/onboarding/tours";

function UpdateClass() {
  const [loading, setLoading] = useState(true);
  // null until the levels list is changed — nothing to save before then.
  const [classList, setClassList] = useState(null);
  // Saved levels the user removed; deleted from the database on Save.
  const [removedIds, setRemovedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  // Bumped to remount ClassByType so it reloads the saved levels (after a
  // save, or to throw away unsaved edits).
  const [levelsVersion, setLevelsVersion] = useState(0);
  const [classTypeList, setClassTypeList] = useState([]);
  const [classType, setClassType] = useState("");
  const [alert, setAlert] = useState({ text: "", severity: "" });
  const refreshSetup = useOnboarding()?.refreshSetup;
  usePageTour(TOURS.classesUpdate, { ready: !loading });

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

  const getClassListFromDnD = (classes, removed = []) => {
    setClassList(classes);
    setRemovedIds(removed);
  };

  const handleClassTypeChange = (value) => {
    setClassType(value);
    setClassList(null);
    setRemovedIds([]);
  };

  const onSubmit = async () => {
    if (!classList || saving) return;
    setSaving(true);
    const deleteResults = await Promise.all(removedIds.map(deleteClassById));
    const failedDeletes = removedIds.filter((_, i) => !deleteResults[i]);
    const newClassList = classList.map((c, i) => {
      return { ...c, order: i + 1 };
    });
    const res =
      newClassList.length === 0 || (await updateAllClassesByClassType(newClassList));
    setSaving(false);
    if (res && failedDeletes.length === 0) {
      setAlert({ text: "Classes saved.", severity: "success" });
      setClassList(null);
      setRemovedIds([]);
      setLevelsVersion((v) => v + 1);
      refreshSetup?.();
    } else if (res) {
      // Levels still referenced elsewhere (e.g. scheduled in a period) can't
      // be deleted; reloading shows them back in the list.
      setRemovedIds([]);
      setClassList(null);
      setLevelsVersion((v) => v + 1);
      setAlert({
        text: `Saved, but ${failedDeletes.length} level${failedDeletes.length === 1 ? "" : "s"} couldn't be deleted. It may still be scheduled in a period.`,
        severity: "error",
      });
    } else {
      setAlert({ text: "Error saving classes", severity: "error" });
    }
  };

  const discardChanges = () => {
    setClassList(null);
    setRemovedIds([]);
    setLevelsVersion((v) => v + 1);
  };

  const saveNewClass = async (res) => {
    await fetchClassTypeList();
    if (res) {
      setAlert({ text: "Class type saved.", severity: "success" });
    } else {
      setAlert({ text: "Error saving class type", severity: "error" });
    }
  };

  if (loading) return <Loading variant="form-page" />;

  return (
    <>
      <PageHeader title="Update classes" breadcrumbs={[{ label: "Classes", href: "/dashboard/classes" }]} />
      <div className="mx-auto max-w-2xl px-4 pb-8">
        {alert.text && (
          <Toast
            text={alert.text}
            severity={alert.severity}
            duration={5000}
            onExited={() => setAlert({ text: "", severity: "" })}
          />
        )}
        <div className="my-6 rounded-lg border border-brand-dark/10 bg-white p-6 md:my-10 md:p-8">
          <p className="text-sm text-brand-dark/70">
            Classes are grouped by <strong>class type</strong> (a track like
            Salsa), and each type has <strong>levels</strong> in order. The order
            matters: when you create a new period, each scheduled class moves up
            to the next level.
          </p>
          {classType && (
            <div className="mt-4 flex justify-end">
              <Button onClick={() => onSubmit()} disabled={!classList || saving}>
                {saving ? "Saving…" : "Update classes"}
              </Button>
            </div>
          )}
          {classList && (
            <Alert severity="warning" className="mt-4">
              You have unsaved changes to this class type&apos;s levels.
              {removedIds.length > 0 &&
                ` ${removedIds.length} level${removedIds.length === 1 ? "" : "s"} will be deleted.`}{" "}
              Click Save to keep them.
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={discardChanges}
              >
                Discard changes
              </Button>
            </Alert>
          )}
          <div data-tour="class-type-create">
            <ClassTypeForm
              onSubmit={(res) => saveNewClass(res)}
              existingNames={classTypeList.map((item) => item.name)}
            />
          </div>
          <div className="mt-6" data-tour="class-type-select">
            <Select
              label="Class type"
              value={classType}
              onChange={handleClassTypeChange}
              placeholder={
                classTypeList.length
                  ? "Choose a class type to see its levels…"
                  : "Create a class type first"
              }
              options={classTypeList.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </div>

          {classType && (
            <div className="mt-6" data-tour="class-levels">
              <p className="mb-2 text-sm text-brand-dark/60">
                Drag levels by their handle to put them in order, first to last.
              </p>
              <ClassByType
                key={`${classType}-${levelsVersion}`}
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
