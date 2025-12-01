import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  mode: 'signin' | 'register';
  onClose: () => void;
}

export const AuthModal = ({ open, mode, onClose }: AuthModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = mode === 'signin' 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: mode === 'signin' ? "Signed in successfully" : "Account created successfully",
        });
        onClose();
        setEmail("");
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signin' 
              ? 'Enter your credentials to access your account' 
              : 'Create a new account to get started'}
          </DialogDescription>
        </DialogHeader>
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
            <Label htmlFor="password">Password</Label>
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
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
