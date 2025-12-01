import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkIfSuperuser } from "@/lib/auth";
import { Navigation } from "@/components/Navigation";
import { AuthModal } from "@/components/AuthModal";
import Index from "./pages/Index";
import Conversation from "./pages/Conversation";
import MyClassroom from "./pages/MyClassroom";
import ClassroomPage from "./pages/ClassroomPage";
import Events from "./pages/Events";
import MyProfile from "./pages/MyProfile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkIfSuperuser(session.user.id).then(setIsSuperuser);
          }, 0);
        } else {
          setIsSuperuser(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkIfSuperuser(session.user.id).then(setIsSuperuser);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthClick = (mode: 'signin' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navigation user={user} isSuperuser={isSuperuser} onAuthClick={handleAuthClick} />
            <AuthModal 
              open={authModalOpen} 
              mode={authMode} 
              onClose={() => setAuthModalOpen(false)} 
            />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/conversation" element={<Conversation />} />
              <Route path="/classroom" element={<MyClassroom />} />
              <Route path="/classroom/:pageId" element={<ClassroomPage />} />
              <Route path="/events" element={<Events />} />
              <Route 
                path="/profile" 
                element={user ? <MyProfile /> : <Navigate to="/" />} 
              />
              <Route 
                path="/admin" 
                element={isSuperuser ? <Admin /> : <Navigate to="/" />} 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
