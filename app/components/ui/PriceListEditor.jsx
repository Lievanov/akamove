"use client";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

const PriceListEditor = ({ prices, onChange, emptyText = "No prices added yet." }) => {
  const addPrice = () => onChange([...prices, ""]);
  const removePrice = (i) => onChange(prices.filter((_, idx) => idx !== i));
  const handlePriceChange = (i, value) => {
    const next = [...prices];
    next[i] = value;
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {prices.length === 0 && (
          <p className="text-sm text-brand-dark/60">{emptyText}</p>
        )}
        {prices.map((price, i) => (
          <div key={i} className="flex w-40 items-center gap-1">
            <Input
              aria-label={`Price option ${i + 1}`}
              type="number"
              value={price}
              onChange={(e) => handlePriceChange(i, e.target.value)}
              prefix="$"
            />
            <IconButton
              aria-label={`Remove price option ${i + 1}`}
              onClick={() => removePrice(i)}
              className="text-danger hover:bg-danger-soft"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addPrice}>
        <Plus className="h-4 w-4" />
        Add Price
      </Button>
    </div>
  );
};

export default PriceListEditor;
