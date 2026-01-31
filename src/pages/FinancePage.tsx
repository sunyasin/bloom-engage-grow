import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { MonthSelector } from "@/components/finance/MonthSelector";
import { FinanceTable } from "@/components/finance/FinanceTable";
import { useFinanceData } from "@/hooks/useFinanceData";

export default function FinancePage() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data, loading, error, refetch } = useFinanceData(currentMonth);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 shadow-medium">
          {/* Заголовок с навигацией */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="p-0 h-auto hover:bg-transparent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {language === "ru" ? "💰 Финансы" : "💰 Finance"}
            </h1>
          </div>

          {/* Переключатель месяца */}
          <div className="flex justify-center mb-6">
            <MonthSelector
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />
          </div>

          {/* Ошибка */}
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-lg">
              {language === "ru" ? "Ошибка загрузки данных:" : "Error loading data:"} {error}
            </div>
          )}

          {/* Таблица */}
          <FinanceTable data={data} isLoading={loading} />
        </Card>
      </div>
    </div>
  );
}
