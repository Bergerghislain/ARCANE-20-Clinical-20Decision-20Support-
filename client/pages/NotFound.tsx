import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <AlertCircle className="h-20 w-20 text-destructive/50 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-primary mb-2">404</h1>
          <p className="text-xl text-foreground font-semibold">Page not found</p>
        </div>

        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
          Please return to the dashboard to continue.
        </p>

        <div className="space-y-3">
          <Link to="/dashboard">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>

          <Link to="/login">
            <Button variant="outline" className="w-full border-secondary text-secondary hover:bg-secondary/10">
              Back to Login
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          ARCANE Clinical Decision Support System
        </p>
      </div>
    </div>
  );
};

export default NotFound;
