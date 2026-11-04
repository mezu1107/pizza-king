import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, MessageSquare } from "lucide-react";

const RiderChat = () => {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("rider_messages" as any).select("*").eq("rider_id", user.id).order("created_at");
    setMsgs((data as any[]) || []);
  };

  useEffect(() => {
    load();
    supabase.from("rider_settings" as any).select("*").limit(1).single().then(({ data }) => setSettings(data));
  }, [user]);

  const send = async () => {
    if (!text.trim() || !user) return;
    await supabase.from("rider_messages" as any).insert({ rider_id: user.id, sender: "rider", body: text.trim() });
    setText("");
    load();
  };

  return (
    <RiderLayout title="Chat Support">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6" /> Support Chat</h1>
        {settings?.support_whatsapp && (
          <a href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">📱 WhatsApp Support</Button>
          </a>
        )}
        <Card>
          <CardContent className="p-4 h-[400px] overflow-y-auto space-y-2">
            {msgs.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No messages yet. Send your first message below.</p>
            ) : msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "rider" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === "rider" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {m.body}
                  <p className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={send} className="gap-1"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </RiderLayout>
  );
};
export default RiderChat;
