import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  group?: string
}

interface ComboboxCustomProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  allowCustom?: boolean
}

export function ComboboxCustom({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyText = "No option found.",
  allowCustom = true,
}: ComboboxCustomProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, ComboboxOption[]> = {}
    options.forEach(option => {
      const group = option.group || "Other"
      if (!groups[group]) groups[group] = []
      groups[group].push(option)
    })
    return groups
  }, [options])

  const handleSelect = (currentValue: string) => {
    onChange(currentValue)
    setOpen(false)
  }

  const handleCreate = () => {
    if (inputValue) {
      onChange(inputValue)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom && inputValue ? (
                 <div className="p-2">
                   <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="w-full justify-start"
                     onClick={handleCreate}
                   >
                     <Plus className="mr-2 h-4 w-4" />
                     Create "{inputValue}"
                   </Button>
                 </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            
            {Object.entries(groupedOptions).map(([group, groupOptions]) => (
              <CommandGroup key={group} heading={group}>
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            
            {allowCustom && inputValue && !options.some(o => o.value.toLowerCase() === inputValue.toLowerCase()) && (
               <>
                 <CommandSeparator />
                 <CommandGroup heading="Create new">
                   <CommandItem value={inputValue} onSelect={handleCreate}>
                     <Plus className="mr-2 h-4 w-4" />
                     Create "{inputValue}"
                   </CommandItem>
                 </CommandGroup>
               </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
