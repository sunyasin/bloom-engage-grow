import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subMonths, addMonths } from "date-fns";
import { ru } from "date-fns/locale";

interface MonthSelectorProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function MonthSelector({ currentMonth, onMonthChange }: MonthSelectorProps) {
  const canGoNext = useMemo(() => {
    const next = addMonths(currentMonth, 1);
    return next <= new Date();
  }, [currentMonth]);

  const handlePrev = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNext = () => {
    if (canGoNext) {
      onMonthChange(addMonths(currentMonth, 1));
    }
  };

  const monthName = format(currentMonth, "LLLL yyyy", { locale: ru });

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handlePrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-lg font-semibold min-w-[140px] text-center capitalize">
        {monthName}
      </span>
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={!canGoNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
