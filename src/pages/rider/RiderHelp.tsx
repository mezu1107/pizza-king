import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HelpCircle, Phone, MessageSquare } from "lucide-react";

const FAQS = [
  { q: "How do I accept an order?", a: "Active orders appear on your Dashboard and Active Orders page. Tap 'Pick Up' once you collect the order from the restaurant." },
  { q: "When do I get paid?", a: "Earnings accumulate as a percentage of each delivered order. You can request a payout from the Wallet page once you reach the minimum amount." },
  { q: "What if a customer is unreachable?", a: "Try calling 2–3 times, then contact support via Chat or WhatsApp. Do not leave the order unattended." },
  { q: "How do I update my schedule?", a: "Go to the Schedule page and toggle availability per day with start/end times." },
  { q: "What documents do I need?", a: "Upload your CNIC, driving license, and bike registration in the Documents page. Admin will approve them." },
];

const RiderHelp = () => {
  const [settings, setSettings] = useState<any>(null);
  useEffect(() => {
    supabase.from("rider_settings" as any).select("*").limit(1).single().then(({ data }) => setSettings(data));
  }, []);

  return (
    <RiderLayout title="Help Center">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><HelpCircle className="w-6 h-6" /> Help Center</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Need urgent help?</CardTitle></CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            {settings?.support_phone && (
              <a href={`tel:${settings.support_phone}`}><Button variant="outline" className="gap-2 w-full"><Phone className="w-4 h-4" /> Call Support</Button></a>
            )}
            {settings?.support_whatsapp && (
              <a href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2 w-full"><MessageSquare className="w-4 h-4" /> WhatsApp</Button>
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Frequently Asked Questions</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};
export default RiderHelp;
