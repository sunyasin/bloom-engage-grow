import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkIfSuperuser } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import MyCommunities from "./pages/MyCommunities";
import Community from "./pages/Community";
import Events from "./pages/Events";
import MyProfile from "./pages/MyProfile";
import Admin from "./pages/Admin";
import Help from "./pages/Help";
import MyCourses from "./pages/MyCourses";
import CourseEditor from "./pages/CourseEditor";
import CoursePreview from "./pages/CoursePreview";
import LessonEditor from "./pages/LessonEditor";
import CommunityLessonBuilder from "./pages/CommunityLessonBuilder";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  const checkUserRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const roles = data?.map(r => r.role) || [];
    setIsSuperuser(roles.includes('superuser'));
    setIsAuthor(roles.includes('author'));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkUserRoles(session.user.id);
          }, 0);
        } else {
          setIsSuperuser(false);
          setIsAuthor(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRoles(session.user.id);
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
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <Header 
                user={user} 
                isSuperuser={isSuperuser} 
                isAuthor={isAuthor}
                onAuthClick={handleAuthClick} 
              />
              <AuthModal 
                open={authModalOpen} 
                mode={authMode} 
                onClose={() => setAuthModalOpen(false)} 
              />
              <Routes>
                <Route path="/" element={<Home user={user} />} />
                <Route path="/discover" element={<Discover user={user} />} />
                <Route path="/my-communities" element={user ? <MyCommunities user={user} /> : <Navigate to="/" />} />
                <Route path="/community/:id" element={<Community user={user} />} />
                <Route path="/events" element={<Events />} />
                <Route path="/map" element={<div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Map coming soon...</div>} />
                <Route path="/help" element={<Help />} />
                <Route 
                  path="/profile" 
                  element={user ? <MyProfile /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/admin" 
                  element={isSuperuser ? <Admin /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/my-courses" 
                  element={(isAuthor || isSuperuser) ? <MyCourses /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/course/:courseId/lessons" 
                  element={(isAuthor || isSuperuser) ? <CourseEditor /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/course/:courseId/lesson/:lessonId" 
                  element={user ? <LessonEditor /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/community/:communityId/lessons" 
                  element={user ? <CommunityLessonBuilder user={user} /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/course/:courseId/preview" 
                  element={<CoursePreview user={user} />} 
                />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

export default App;
