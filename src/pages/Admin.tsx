import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Settings, CreditCard, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminMessagesSection } from "@/components/admin/AdminMessagesSection";
import { AdminTiersModerationSection } from "@/components/admin/AdminTiersModerationSection";
import { AdminSubscriptionsSection } from "@/components/admin/AdminSubscriptionsSection";
import { AdminWebhookLogsSection } from "@/components/admin/AdminWebhookLogsSection";

type AdminSection = "messages" | "tiers" | "subscriptions" | "webhooks";

export default function Admin() {
  const [activeSection, setActiveSection] = useState<AdminSection>("tiers");

  const sections = [
    { id: "messages" as const, label: "Сообщения", icon: MessageSquare },
    { id: "tiers" as const, label: "Изменения в tiers", icon: Settings },
    { id: "subscriptions" as const, label: "Подписки", icon: CreditCard },
    { id: "webhooks" as const, label: "Логи вебхуков", icon: Webhook },
  ];
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-accent">Панель администратора</h1>
        
        <div className="flex gap-6">
          {/* Left sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      activeSection === section.id && "bg-secondary"
                    )}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </Button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Right content */}
          <div className="flex-1">
            {activeSection === "messages" && <AdminMessagesSection />}
            {activeSection === "tiers" && <AdminTiersModerationSection />}
            {activeSection === "subscriptions" && <AdminSubscriptionsSection />}
            {activeSection === "webhooks" && <AdminWebhookLogsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
