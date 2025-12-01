import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { User, Session } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavigationProps {
  user: User | null;
  isSuperuser: boolean;
  onAuthClick: (mode: 'signin' | 'register') => void;
}

export const Navigation = ({ user, isSuperuser, onAuthClick }: NavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
      navigate("/");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EduPlatform
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/conversation" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
                Conversation
              </Link>
              <Link to="/classroom" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
                My Classroom
              </Link>
              <Link to="/events" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
                Events
              </Link>
              {user && (
                <Link to="/profile" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
                  My Profile
                </Link>
              )}
              {isSuperuser && (
                <Link to="/admin" className="text-sm font-medium text-accent hover:text-accent/80 transition-smooth">
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!user ? (
              <>
                <Button variant="ghost" onClick={() => onAuthClick('signin')}>
                  Sign In
                </Button>
                <Button onClick={() => onAuthClick('register')} className="bg-gradient-primary">
                  Register
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={handleSignOut}>
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
