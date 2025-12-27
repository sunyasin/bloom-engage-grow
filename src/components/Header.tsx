import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCommunityTabs } from "@/contexts/CommunityTabsContext";

interface HeaderProps {
  user: User | null;
  isSuperuser: boolean;
  isAuthor: boolean;
  onAuthClick: (mode: 'signin' | 'register') => void;
  logoUrl?: string;
}

export const Header = ({ user, isSuperuser, isAuthor, onAuthClick, logoUrl }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { tabs, activeTab, setActiveTab, communityId } = useCommunityTabs();
  
  // Check if we're on a community page
  const isCommunityPage = location.pathname.startsWith('/community/') && communityId;

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Успешно",
        description: "Вы вышли из системы",
      });
      navigate("/");
    }
  };

  const NavLinks = () => (
    <>
      {/* Сообщества - первый пункт слева */}
      <Link
        to={user ? "/my-communities" : "/discover"}
        className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
        onClick={() => setMobileMenuOpen(false)}
      >
        Сообщества
      </Link>
      
      {/* Community tabs when on community page */}
      {isCommunityPage && tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => {
            setActiveTab(tab.value);
            setMobileMenuOpen(false);
          }}
          className={`text-sm font-medium transition-smooth ${
            activeTab === tab.value 
              ? 'text-primary' 
              : 'text-foreground/80 hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
      
      {user && !isCommunityPage && (
        <>
          {(isAuthor || isSuperuser) && (
            <Link
              to="/my-courses"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              Мои курсы
            </Link>
          )}
          {isSuperuser && (
            <Link
              to="/admin"
              className="text-sm font-medium text-accent hover:text-accent/80 transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              Админ
            </Link>
          )}
        </>
      )}
      
      {/* Кабинет - последний пункт */}
      {user && (
        <Link
          to="/profile"
          className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
          onClick={() => setMobileMenuOpen(false)}
        >
          Кабинет
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
              ) : (
                <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Univer
                </span>
              )}
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <NavLinks />
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link 
              to="/help" 
              className="text-muted-foreground hover:text-foreground transition-smooth"
            >
              <HelpCircle className="h-5 w-5" />
            </Link>
            
            {/* Desktop auth buttons */}
            <div className="hidden md:flex items-center gap-2">
              {!user ? (
                <>
                  <Button variant="ghost" onClick={() => onAuthClick('signin')}>
                    Войти
                  </Button>
                  <Button onClick={() => onAuthClick('register')} className="bg-gradient-primary">
                    Регистрация
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={handleSignOut}>
                  Выйти
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <NavLinks />
              {!user ? (
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Button variant="ghost" onClick={() => { onAuthClick('signin'); setMobileMenuOpen(false); }}>
                    Войти
                  </Button>
                  <Button onClick={() => { onAuthClick('register'); setMobileMenuOpen(false); }} className="bg-gradient-primary">
                    Регистрация
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="mt-4">
                  Выйти
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
