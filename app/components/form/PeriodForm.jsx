"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import Loading from "../Loading";
import moment from "moment";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import TextInput from "@/app/components/ui/TextInput";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { Select } from "@/app/components/ui/Select";
import { Combobox } from "@/app/components/ui/Combobox";
import { Input } from "@/app/components/ui/Input";
import { Chip } from "@/app/components/ui/Chip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/Tabs";
import PriceListEditor from "@/app/components/ui/PriceListEditor";
import { getAllLocations } from "@/api/location/location";
import { getAllClasses } from "@/api/class/class";
import { getDefaultPrices } from "@/api/settings/settings";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_OPTIONS = DAYS.map((d) => ({ value: d, label: d }));
const emptySlot = () => ({ day_of_week: "Monday", class_time: "18:00", class_id: "" });

const SectionHeader = ({ children }) => (
  <div className="mb-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
      {children}
    </p>
    <hr className="mt-1 border-brand-dark/10" />
  </div>
);

const PeriodForm = ({ onSubmit, period, existingSchedule = [] }) => {
  const [loading, setLoading] = useState(true);
  const [start_date, setStartDate] = useState(null);
  const [end_date, setEndDate] = useState(null);
  const [prices, setPrices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  const { control, setValue, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const [locs, cls] = await Promise.all([getAllLocations(), getAllClasses()]);
    setLocations(locs ?? []);
    setClasses(cls ?? []);

    if (existingSchedule.length) {
      const grouped = {};
      existingSchedule.forEach((row) => {
        if (!grouped[row.location_id]) grouped[row.location_id] = [];
        grouped[row.location_id].push({
          day_of_week: row.day_of_week,
          class_time: row.class_time?.slice(0, 5) ?? "09:00",
          class_id: row.class_id,
        });
      });
      setSchedule(grouped);
    }

    if (period) {
      setValue("name", period.name);
      setStartDate(period.start_date ? moment(period.start_date).toDate() : null);
      setEndDate(period.end_date ? moment(period.end_date).toDate() : null);
      setPrices(period.prices ?? []);
    } else {
      // New period: pre-fill with the default pricing configured in Settings
      const defaultPrices = await getDefaultPrices();
      if (defaultPrices.length) setPrices(defaultPrices);
    }
    setLoading(false);
  };

  // schedule
  const addSlot = (locationId) =>
    setSchedule((prev) => ({ ...prev, [locationId]: [...(prev[locationId] ?? []), emptySlot()] }));
  const removeSlot = (locationId, idx) =>
    setSchedule((prev) => ({ ...prev, [locationId]: prev[locationId].filter((_, i) => i !== idx) }));
  const updateSlot = (locationId, idx, field, value) =>
    setSchedule((prev) => {
      const slots = [...(prev[locationId] ?? [])];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, [locationId]: slots };
    });
  const moveSlot = (locationId, idx, direction) =>
    setSchedule((prev) => {
      const slots = [...(prev[locationId] ?? [])];
      const target = idx + direction;
      if (target < 0 || target >= slots.length) return prev;
      [slots[idx], slots[target]] = [slots[target], slots[idx]];
      return { ...prev, [locationId]: slots };
    });

  const preSubmit = async (data) => {
    data.start_date = start_date ? moment(start_date).format("MM/DD/YYYY") : null;
    data.end_date = end_date ? moment(end_date).format("MM/DD/YYYY") : null;
    data.prices = prices.map(Number);
    data.schedule = Object.entries(schedule).flatMap(([locationId, slots]) =>
      slots
        .filter((s) => s.class_id)
        .map((s, idx) => ({ location_id: locationId, ...s, sort_order: idx }))
    );
    await onSubmit(data);
  };

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8">
      <div className="my-6 overflow-hidden rounded-lg border border-brand-dark/10 md:my-10">
        <div className="bg-brand-dark px-6 py-5">
          <h1 className="text-xl font-semibold text-white">
            {period ? "Update Period" : "New Period"}
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {period
              ? "Edit the period details and class schedule below."
              : "Fill in the period details and set up the class schedule per location."}
          </p>
        </div>

        <form onSubmit={handleSubmit(preSubmit)}>
          <div className="px-6 py-6">
            <div className="mb-8">
              <SectionHeader>Period Details</SectionHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextInput
                  property="name"
                  label="Period Name *"
                  errors={errors}
                  control={control}
                  required="Name is required"
                  placeholder="May 2025"
                />
                <DatePicker
                  label="Start Date"
                  value={start_date}
                  onChange={setStartDate}
                />
                <DatePicker
                  label="End Date"
                  value={end_date}
                  onChange={setEndDate}
                />
              </div>
            </div>

            <div className="mb-8">
              <SectionHeader>Pricing</SectionHeader>
              <PriceListEditor prices={prices} onChange={setPrices} />
            </div>

            {locations.length > 0 && (
              <div>
                <SectionHeader>Class Schedule</SectionHeader>
                <div className="rounded-lg border border-brand-dark/10">
                  <Tabs
                    value={String(activeTab)}
                    onValueChange={(v) => setActiveTab(Number(v))}
                  >
                    <TabsList>
                      {locations.map((loc, i) => {
                        const count = (schedule[loc.id] ?? []).length;
                        return (
                          <TabsTrigger key={loc.id} value={String(i)}>
                            {loc.name}
                            {count > 0 && (
                              <Chip label={count} className="bg-brand-pink" />
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {locations.map((loc, i) => (
                      <TabsContent key={loc.id} value={String(i)}>
                        {(schedule[loc.id] ?? []).length === 0 ? (
                          <div className="mb-2 rounded-lg border border-dashed border-brand-dark/20 py-8 text-center">
                            <p className="text-sm text-brand-dark/60">
                              No classes scheduled for <strong>{loc.name}</strong> yet.
                            </p>
                            <p className="text-xs text-brand-dark/40">
                              Click &ldquo;Add Class&rdquo; to add the first one.
                            </p>
                          </div>
                        ) : (
                          <div className="mb-2 space-y-2">
                            <div className="flex items-center gap-2 px-1 text-xs font-semibold text-brand-dark/50">
                              <span className="w-36 shrink-0">Day</span>
                              <span className="w-28 shrink-0">Time</span>
                              <span className="flex-1">Class</span>
                              <span className="w-16 shrink-0" />
                              <span className="w-8 shrink-0" />
                            </div>

                            {(schedule[loc.id] ?? []).map((slot, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 rounded-md border border-brand-dark/10 px-2 py-2 hover:border-brand-pink/40"
                              >
                                <div className="w-36 shrink-0">
                                  <Select
                                    value={slot.day_of_week}
                                    onChange={(v) => updateSlot(loc.id, idx, "day_of_week", v)}
                                    options={DAY_OPTIONS}
                                  />
                                </div>
                                <div className="w-28 shrink-0">
                                  <Input
                                    type="time"
                                    value={slot.class_time}
                                    onChange={(e) => updateSlot(loc.id, idx, "class_time", e.target.value)}
                                  />
                                </div>
                                <div className="flex-1">
                                  <Combobox
                                    value={classes.find((c) => c.id === slot.class_id) ?? null}
                                    onChange={(option) =>
                                      updateSlot(loc.id, idx, "class_id", option?.id ?? "")
                                    }
                                    options={classes}
                                    getOptionLabel={(o) => o?.label ?? ""}
                                    placeholder="Search class…"
                                  />
                                </div>
                                <div className="flex w-16 shrink-0">
                                  <IconButton
                                    aria-label="Move up"
                                    onClick={() => moveSlot(loc.id, idx, -1)}
                                    disabled={idx === 0}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </IconButton>
                                  <IconButton
                                    aria-label="Move down"
                                    onClick={() => moveSlot(loc.id, idx, 1)}
                                    disabled={idx === (schedule[loc.id] ?? []).length - 1}
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </IconButton>
                                </div>
                                <div className="w-8 shrink-0">
                                  <IconButton
                                    aria-label="Remove slot"
                                    onClick={() => removeSlot(loc.id, idx)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </IconButton>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button variant="outline" size="sm" onClick={() => addSlot(loc.id)}>
                          <Plus className="h-4 w-4" />
                          Add Class
                        </Button>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-brand-dark/10 bg-brand-dark/5 px-6 py-4">
            <BackButton routeTo="/dashboard/periods" />
            <Button type="submit">
              {period ? "Update Period" : "Create Period"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PeriodForm;
