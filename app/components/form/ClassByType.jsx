import { getClassesByType, updateClassById } from "@/api/class/class";
import { useEffect, useState } from "react";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import ClassItemForm, { findDuplicateLevel } from "./ClassItemForm";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/app/components/ui/Dialog";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";

function ClassByType({ classType, getClassListFromDnD }) {
  const [classes, setClasses] = useState([]);
  // Ids that exist in the database. Removing one of these is only recorded
  // here and handed to the page, which deletes it on Save — nothing is
  // deleted the moment the trash icon is clicked.
  const [persistedIds, setPersistedIds] = useState(new Set());
  const [removedIds, setRemovedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedLevel, setEditedLevel] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (classType) fetchClassesByType(classType);
  }, [classType]);

  const fetchClassesByType = async (classType) => {
    const classList = await getClassesByType(classType);
    setClasses(classList);
    setPersistedIds(new Set(classList.map((c) => c.id)));
    setRemovedIds([]);
    setLoading(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const removeClass = (id) => {
    const classWithRemovedItem = classes.filter((cls) => cls.id !== id);
    const nextRemovedIds = persistedIds.has(id) ? [...removedIds, id] : removedIds;
    setClasses(classWithRemovedItem);
    setRemovedIds(nextRemovedIds);
    getClassListFromDnD(classWithRemovedItem, nextRemovedIds);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = classes.findIndex((item) => item.id === active.id);
      const newIndex = classes.findIndex((item) => item.id === over.id);
      const newClasses = arrayMove(classes, oldIndex, newIndex);
      setClasses(newClasses);
      getClassListFromDnD(newClasses, removedIds);
    }
  };

  const addNewItemClass = (data) => {
    const newItemClass = {
      id: uuidv4(),
      name: data.name,
      level: data.level,
      order: classes.length + 1,
      created_at: new Date(),
      class_type: classType,
    };
    const newClassList = [...classes, newItemClass];
    setClasses(newClassList);
    getClassListFromDnD(newClassList, removedIds);
  };

  const openEditModal = (classItem) => {
    setEditingClass(classItem);
    setEditedName(classItem.name);
    setEditedLevel(classItem.level);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingClass(null);
    setEditedName('');
    setEditedLevel('');
    setEditError('');
  };

  const saveEdit = async () => {
    if (editingClass) {
      const updateData = { name: editedName.trim(), level: String(editedLevel).trim() };
      if (!updateData.name || !updateData.level) {
        setEditError("Class name and level are required.");
        return;
      }
      if (findDuplicateLevel(classes, updateData, editingClass.id)) {
        setEditError(`“${updateData.name} ${updateData.level}” already exists in this class type.`);
        return;
      }
      const success = await updateClassById(editingClass.id, updateData);

      if (success) {
        const updatedClasses = classes.map(c =>
          c.id === editingClass.id
            ? { ...c, ...updateData }
            : c
        );
        setClasses(updatedClasses);
        getClassListFromDnD(updatedClasses, removedIds);
        closeEditModal();
      } else {
        console.error("Failed to update class");
      }
    }
  };

  if (loading) return null;

  return (
    <>
      <ClassItemForm
        classes={classes}
        onSubmit={(data) => addNewItemClass(data)}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {classes.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-brand-dark/20 py-6 text-center text-sm text-brand-dark/60">
            No levels in this class type yet. Add the first one above.
          </p>
        )}
        <SortableContext items={classes} strategy={verticalListSortingStrategy}>
          {classes.map((c) => (
            <SortableItem key={c.id} id={c.id}>
              {(dragHandleProps) => (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-dark/10 bg-white p-4">
                  <p className="text-sm text-brand-dark">
                    {c.name} {c.level}
                  </p>
                  <div className="flex items-center">
                    <IconButton aria-label="Update class" onClick={() => openEditModal(c)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      aria-label={`Remove ${c.name} ${c.level}`}
                      onClick={() => removeClass(c.id)}
                      className="text-danger hover:bg-danger-soft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      aria-label="Reorder class"
                      {...dragHandleProps}
                      className="cursor-move"
                    >
                      <GripVertical className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && closeEditModal()}>
        <DialogContent>
          <DialogTitle>Update class</DialogTitle>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="update-class-name"
                className="mb-1 block text-sm font-medium text-brand-dark"
              >
                Class name
              </label>
              <Input
                id="update-class-name"
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="update-class-level"
                className="mb-1 block text-sm font-medium text-brand-dark"
              >
                Level
              </label>
              <Input
                id="update-class-level"
                value={editedLevel}
                onChange={(e) => setEditedLevel(e.target.value)}
              />
            </div>
          </div>
          {editError && <p className="mt-3 text-sm text-danger">{editError}</p>}
          <DialogActions>
            <Button variant="ghost" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ClassByType;
