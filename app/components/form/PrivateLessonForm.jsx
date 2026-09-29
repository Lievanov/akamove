"use client";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import moment from "moment";
import { debounce } from "lodash";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";
import TextInput from "@/app/components/ui/TextInput";
import { Combobox } from "@/app/components/ui/Combobox";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { getStudents } from "@/api/student/students";
import { getAllInstructors } from "@/api/instructor/instructor";

const PrivateLessonForm = ({
  onSubmit,
  lesson,
  presetStudent,
  backRouteTo = "/dashboard/private-lessons",
}) => {
  const {
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const watchedAmount = watch("amount");
  const watchedLessonsPurchased = watch("lessons_purchased");
  const perLesson =
    Number(watchedAmount) > 0 && Number(watchedLessonsPurchased) > 0
      ? (Number(watchedAmount) / Number(watchedLessonsPurchased)).toFixed(2)
      : null;

  const [datePurchased, setDatePurchased] = useState(new Date());
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentOptions, setStudentOptions] = useState([]);

  const searchStudents = useCallback(
    debounce(async (value) => {
      const results = await getStudents(0, 9, value);
      setStudentOptions(results || []);
    }, 300),
    []
  );

  useEffect(() => {
    const init = async () => {
      const allInstructors = await getAllInstructors();
      setInstructors(allInstructors || []);

      if (lesson) {
        setValue("lessons_purchased", lesson.lessons_purchased);
        setValue("amount", lesson.amount);
        setDatePurchased(
          lesson.date_purchased ? moment(lesson.date_purchased).toDate() : new Date()
        );

        const instructor = (allInstructors || []).find(
          (i) => i.id === lesson.instructor_id
        );
        setSelectedInstructor(instructor || null);

        if (lesson.student) {
          setSelectedStudent({
            id: lesson.student_id,
            first_name: lesson.student.first_name,
            last_name: lesson.student.last_name,
          });
        }
      }
    };
    init();
  }, [lesson]);

  useEffect(() => {
    if (presetStudent && !lesson) {
      setSelectedStudent({
        id: presetStudent.id,
        first_name: presetStudent.first_name,
        last_name: presetStudent.last_name,
      });
    }
  }, [presetStudent, lesson]);

  const preSubmit = async (data) => {
    await onSubmit({
      ...data,
      student_id: selectedStudent?.id,
      instructor_id: selectedInstructor?.id,
      date_purchased: moment(datePurchased).format("YYYY-MM-DD"),
      lessons_purchased: Number(data.lessons_purchased),
      amount: Number(data.amount),
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      <div className="my-6 rounded-lg border border-brand-dark/10 p-6 md:my-10 md:p-8">
        <h1 className="text-center text-2xl font-semibold text-brand-dark">
          {lesson ? "Update" : "New"} Private Lesson
        </h1>
        <form onSubmit={handleSubmit(preSubmit)} className="mt-6">
          <div className="space-y-4 border-t border-brand-dark/10 pt-6">
            <Combobox
              label="Student*"
              value={selectedStudent}
              onChange={setSelectedStudent}
              onSearchChange={searchStudents}
              options={studentOptions}
              getOptionLabel={(o) => `${o.first_name} ${o.last_name}`}
              placeholder="Search by name"
              searchPlaceholder="Search by name"
            />
            <Combobox
              label="Instructor*"
              value={selectedInstructor}
              onChange={setSelectedInstructor}
              options={instructors}
              getOptionLabel={(o) => o.name}
            />
            <TextInput
              property="lessons_purchased"
              label="Lessons Purchased*"
              errors={errors}
              control={control}
              required="Lessons purchased is required"
              type="number"
              step="1"
            />
            <DatePicker
              label="Date Purchased"
              value={datePurchased}
              onChange={setDatePurchased}
            />
            <TextInput
              property="amount"
              label="Amount*"
              errors={errors}
              control={control}
              required="Amount is required"
              type="number"
              step="0.01"
              prefix="$"
            />
            {perLesson && (
              <p className="text-sm text-brand-dark/60">
                Per Lesson: <span className="font-bold text-brand-dark">${perLesson}</span>
              </p>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <BackButton routeTo={backRouteTo} />
            <Button type="submit" autoFocus>
              {lesson ? "Update" : "Create"} Private Lesson
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrivateLessonForm;
