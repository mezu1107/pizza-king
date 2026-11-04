import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, ArrowRight, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UnlockPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Optional query params for context: which feature is locked.
  const moduleName = searchParams.get("name") ?? "Premium Feature";

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-10 space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
              <Lock className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{moduleName}</h1>
            <p className="text-sm text-muted-foreground">
              This feature is part of our premium plans. Choose a plan to unlock it.
            </p>
          </div>

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
            onClick={() => navigate("/feature-store")}
          >
            <ShoppingBag className="w-4 h-4" />
            View Plans &amp; Pricing
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
