import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UnlockPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const moduleName = searchParams.get("name") ?? "Premium Feature";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Lock className="w-16 h-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Premium Feature</CardTitle>
          <p className="text-muted-foreground font-medium">{moduleName}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This module is part of the Pizza King Pro plan. Unlock all premium features to access it.
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/admin/subscriptions">Manage Subscriptions</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90"
            >
              <a href="#">Buy All Modules — Unlock Everything</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
