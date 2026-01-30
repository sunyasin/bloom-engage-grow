import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { signIn, signUp, resetPassword } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";

interface AuthModalProps {
  open: boolean;
  mode: 'signin' | 'register';
  onClose: () => void;
}

export const AuthModal = ({ open, mode, onClose }: AuthModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Check for referral code on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: t('common.error'),
            description: error.message,
            variant: "destructive",
          });
          setShowForgotPassword(true);
        } else {
          toast({
            title: t('auth.success'),
            description: t('auth.signedInSuccessfully'),
          });
          onClose();
          setEmail("");
          setPassword("");
          setShowForgotPassword(false);
        }
      } else {
        // Register mode - handle referral code
        const { error, data } = await signUp(email, password);
        
        if (error) {
          toast({
            title: t('common.error'),
            description: error.message,
            variant: "destructive",
          });
        } else {
          // Check for referral code and update profile
          const referralCode = localStorage.getItem('referral_code');
          if (referralCode && data?.user?.id) {
            // Find referrer by referral_code
            const { data: referrer } = await supabase
              .from('profiles')
              .select('id')
              .eq('referral_code', referralCode)
              .single();
            
            if (referrer) {
              // Update the new user's profile with referred_by
              await supabase
                .from('profiles')
                .update({ referred_by: referrer.id })
                .eq('id', data.user.id);
              
              localStorage.removeItem('referral_code');
            }
          }
          
          toast({
            title: t('auth.success'),
            description: t('auth.accountCreatedSuccessfully'),
          });
          onClose();
          setEmail("");
          setPassword("");
          setShowForgotPassword(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: t('common.error'),
        description: t('auth.enterEmailFirst'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: t('auth.success'),
          description: t('auth.resetEmailSent'),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setShowForgotPassword(false);
    setResetEmailSent(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === 'signin' ? t('auth.signIn') : t('auth.createAccount')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signin' 
              ? t('auth.enterCredentials') 
              : t('auth.createNewAccount')}
          </DialogDescription>
        </DialogHeader>
        {resetEmailSent ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">{t('auth.checkEmailForReset')}</p>
            <Button 
              variant="link" 
              onClick={() => setResetEmailSent(false)}
              className="mt-2"
            >
              {t('auth.backToLogin')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {showForgotPassword && mode === 'signin' && (
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                {t('auth.forgotPassword')}
              </Button>
            )}
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              {loading ? t('auth.processing') : mode === 'signin' ? t('auth.signIn') : t('auth.createAccount')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
