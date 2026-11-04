import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, MessageCircle, Sparkles } from "lucide-react";
import AIChatAssistant, { type AIChatHandle } from "@/components/AIChatAssistant";
import { useRef } from "react";

const WHATSAPP_URL =
  "https://wa.me/923173712950?text=Assalam%20o%20Alaikum!%20I%20want%20to%20order%20from%20The%20Young%20Malang";

const FloatingActionMenu = () => {
  const [open, setOpen] = useState(false);
  const aiRef = useRef<AIChatHandle>(null);

  const openAI = () => {
    setOpen(false);
    aiRef.current?.open();
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <>
              <motion.a
                key="wa"
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="flex items-center gap-2 pl-3 pr-4 py-2.5 bg-card text-foreground rounded-full shadow-lg border border-border hover:bg-muted"
                onClick={() => setOpen(false)}
                aria-label="Order on WhatsApp"
              >
                <span className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </span>
                <span className="text-sm font-semibold">WhatsApp</span>
              </motion.a>

              <motion.button
                key="ai"
                type="button"
                onClick={openAI}
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.04 }}
                className="flex items-center gap-2 pl-3 pr-4 py-2.5 bg-card text-foreground rounded-full shadow-lg border border-border hover:bg-muted"
                aria-label="Open AI Assistant"
              >
                <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-sm font-semibold">AI Assistant</span>
              </motion.button>
            </>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center border-2 border-accent/40"
          aria-label={open ? "Close menu" : "Open quick actions"}
          aria-expanded={open}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "x" : "plus"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute"
            >
              {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </motion.span>
          </AnimatePresence>
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full animate-ping" />
          )}
        </motion.button>
      </div>

      <AIChatAssistant ref={aiRef} hideTrigger />
    </>
  );
};

export default FloatingActionMenu;
