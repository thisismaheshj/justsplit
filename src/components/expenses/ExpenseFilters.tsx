import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TransactionFilters } from '@/store/selectors';
import type { Category, Person } from '@/types';

const ANY = '__any__';

interface ExpenseFiltersProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  people: Person[];
  categories: Category[];
}

export function ExpenseFilters({ filters, onChange, people, categories }: ExpenseFiltersProps) {
  const set = (patch: Partial<TransactionFilters>) => onChange({ ...filters, ...patch });
  const active =
    Boolean(filters.personId) ||
    Boolean(filters.category) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    Boolean(filters.query);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="expense-search"
          aria-label="Search expenses"
          placeholder="Search descriptions and notes"
          className="pl-9"
          value={filters.query ?? ''}
          onChange={(event) => set({ query: event.target.value || undefined })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-person">Person</Label>
          <Select
            value={filters.personId ?? ANY}
            onValueChange={(value) => set({ personId: value === ANY ? undefined : value })}
          >
            <SelectTrigger id="filter-person">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Anyone</SelectItem>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-category">Category</Label>
          <Select
            value={filters.category ?? ANY}
            onValueChange={(value) => set({ category: value === ANY ? undefined : value })}
          >
            <SelectTrigger id="filter-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">From</Label>
          <DatePicker
            id="filter-from"
            value={filters.from ?? ''}
            max={filters.to}
            onChange={(value) => set({ from: value || undefined })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">To</Label>
          <DatePicker
            id="filter-to"
            value={filters.to ?? ''}
            min={filters.from}
            onChange={(value) => set({ to: value || undefined })}
          />
        </div>
      </div>

      {active && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            <X aria-hidden />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
