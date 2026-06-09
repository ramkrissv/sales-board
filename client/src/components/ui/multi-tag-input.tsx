import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useState, KeyboardEvent } from "react";

interface MultiTagInputProps {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function MultiTagInput({ value = [], onChange, placeholder }: MultiTagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background border-input min-h-[42px]">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1 py-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:bg-muted p-0.5 rounded-full"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </Badge>
      ))}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 border-0 focus-visible:ring-0 p-0 h-6 min-w-[120px] bg-transparent shadow-none"
      />
    </div>
  );
}
