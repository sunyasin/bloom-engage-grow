import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { HelpCircle, Menu, X } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  user: User | null;
  isSuperuser: boolean;
  isAuthor: boolean;
  onAuthClick: (mode: 'signin' | 'register') => void;
  logoUrl?: string;
}

export const Header = ({ user, isSuperuser, isAuthor, onAuthClick, logoUrl }: HeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const NavLinks = () => (
    <>
      {!user ? (
        <>
          <Link 
            to="/discover" 
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('nav.communities')}
          </Link>
          <Link 
            to="/map" 
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('nav.map')}
          </Link>
        </>
      ) : (
        <>
          <Link 
            to="/my-communities" 
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('nav.myCommunities')}
          </Link>
          <Link 
            to="/events" 
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('nav.events')}
          </Link>
          <Link 
            to="/map" 
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('nav.map')}
          </Link>
          <Link 
            to="/profile" 
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('nav.profile')}
          </Link>
          {isSuperuser && (
            <Link 
              to="/admin" 
              className="text-sm font-medium text-accent hover:text-accent/80 transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.admin')}
            </Link>
          )}
        </>
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
                  Skool
                </span>
              )}
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <NavLinks />
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
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
                    {t('nav.signIn')}
                  </Button>
                  <Button onClick={() => onAuthClick('register')} className="bg-gradient-primary">
                    {t('nav.register')}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={handleSignOut}>
                  {t('nav.signOut')}
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
                    {t('nav.signIn')}
                  </Button>
                  <Button onClick={() => { onAuthClick('register'); setMobileMenuOpen(false); }} className="bg-gradient-primary">
                    {t('nav.register')}
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="mt-4">
                  {t('nav.signOut')}
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
