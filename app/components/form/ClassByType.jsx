import { deleteClassById, getClassesByType, updateClassById } from "@/api/class/class";
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
import ClassItemForm from "./ClassItemForm";
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
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedLevel, setEditedLevel] = useState('');

  useEffect(() => {
    if (classType) fetchClassesByType(classType);
  }, [classType]);

  const fetchClassesByType = async (classType) => {
    const classList = await getClassesByType(classType);
    setClasses(classList);
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

  const deleteClass = async (id) => {
    await deleteClassById(id);
    const classWithRemovedItem = classes.filter((cls) => cls.id !== id);
    setClasses(classWithRemovedItem);
    getClassListFromDnD(classWithRemovedItem);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = classes.findIndex((item) => item.id === active.id);
      const newIndex = classes.findIndex((item) => item.id === over.id);
      const newClasses = arrayMove(classes, oldIndex, newIndex);
      setClasses(newClasses);
      getClassListFromDnD(newClasses);
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
    getClassListFromDnD(newClassList);
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
  };

  const saveEdit = async () => {
    if (editingClass) {
      const updateData = { name: editedName, level: editedLevel };
      const success = await updateClassById(editingClass.id, updateData);

      if (success) {
        const updatedClasses = classes.map(c =>
          c.id === editingClass.id
            ? { ...c, name: editedName, level: editedLevel }
            : c
        );
        setClasses(updatedClasses);
        getClassListFromDnD(updatedClasses);
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
        <SortableContext items={classes} strategy={verticalListSortingStrategy}>
          {classes.map((c) => (
            <SortableItem key={c.id} id={c.id}>
              {(dragHandleProps) => (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-dark/10 p-4">
                  <p className="text-sm text-brand-dark">
                    {c.name} {c.level}
                  </p>
                  <div className="flex items-center">
                    <IconButton aria-label="Edit class" onClick={() => openEditModal(c)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      aria-label="Delete class"
                      onClick={() => deleteClass(c.id)}
                      className="text-red-600 hover:bg-red-50"
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
          <DialogTitle>Edit Class</DialogTitle>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">
                Class Name
              </label>
              <Input
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">
                Level
              </label>
              <Input
                value={editedLevel}
                onChange={(e) => setEditedLevel(e.target.value)}
              />
            </div>
          </div>
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
