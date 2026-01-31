import { useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export interface FinanceTransaction {
  id: string;
  community_name: string;
  tier_name: string;
  subscriber_name: string;
  amount: number;
  date: string;
  type: "payment" | "payout";
}

interface FinanceTableProps {
  data: FinanceTransaction[];
  isLoading: boolean;
}

export function FinanceTable({ data, isLoading }: FinanceTableProps) {
  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        totalPaid: acc.totalPaid + (row.type === "payment" ? row.amount : 0),
        totalPayout: acc.totalPayout + (row.type === "payout" ? row.amount : 0),
      }),
      { totalPaid: 0, totalPayout: 0 }
    );
  }, [data]);

  const totalToPay = totals.totalPaid - totals.totalPayout;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: ru });
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Загрузка данных...</p>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Нет данных за выбранный период</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Сообщество</TableHead>
              <TableHead>Подписчик</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(row.date)}
                </TableCell>
                <TableCell className="font-medium">{row.community_name}</TableCell>
                <TableCell>{row.subscriber_name}</TableCell>
                <TableCell>
                  {row.type === "payment" ? `Подписка: ${row.tier_name}` : row.tier_name}
                </TableCell>
                <TableCell className={`text-right font-medium ${row.type === "payment" ? "text-green-600" : "text-blue-600"}`}>
                  {row.type === "payment" ? "+" : "-"}{Number(row.amount).toLocaleString('ru-RU')} ₽
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Итоги */}
      <Card className="p-4 bg-muted/50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Всего оплачено</p>
            <p className="text-2xl font-bold text-green-600">
              +{totals.totalPaid.toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Всего выплачено</p>
            <p className="text-2xl font-bold text-blue-600">
              -{totals.totalPayout.toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">К выплате</p>
          <p className="text-3xl font-bold text-primary">
            {totalToPay.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </Card>
    </div>
  );
}
