import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PortalSubscriptionSelector } from "@/components/PortalSubscriptionSelector";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ReferralBlock } from "@/components/ReferralBlock";
import { useNavigate } from "react-router-dom";

interface PortalSubscription {
  id: string;
  name: string;
  badge_text: string;
  price: number;
}

export default function MyProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PortalSubscription | null>(null);
  const { toast } = useToast();
  const { language } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      
      // Fetch current portal subscription
      if (data.portal_subscription_id) {
        const { data: planData } = await supabase
          .from('portal_subscriptions')
          .select('id, name, badge_text, price')
          .eq('id', data.portal_subscription_id)
          .maybeSingle();
        
        setCurrentPlan(planData);
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 1MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create a canvas to resize the image
      const img = new Image();
      const reader = new FileReader();

      reader.onload = async (e) => {
        img.src = e.target?.result as string;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0, 100, 100);

          canvas.toBlob(async (blob) => {
            if (!blob) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, blob);

            if (uploadError) {
              toast({
                title: "Error",
                description: uploadError.message,
                variant: "destructive",
              });
              return;
            }

            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: urlData.publicUrl })
              .eq('id', profile.id);

            if (!updateError) {
              toast({
                title: "Success",
                description: "Avatar updated successfully",
              });
              fetchProfile();
            }
          }, 'image/jpeg');
        };
      };

      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      real_name: formData.get('real_name') as string,
      state: formData.get('state') as string,
      city: formData.get('city') as string,
      about_me: formData.get('about_me') as string,
      sbp_phone: formData.get('sbp_phone') as string,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      fetchProfile();
    }
  };

  if (!profile) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 shadow-medium">
          <h1 className="text-3xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
            My Profile
          </h1>
          
          <div className="flex items-center gap-6 mb-8">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl">{profile.real_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </Label>
              <p className="text-sm text-muted-foreground mt-2">Max 1MB, 100x100px</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={profile.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="real_name">Real Name</Label>
              <Input
                id="real_name"
                name="real_name"
                defaultValue={profile.real_name || ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={profile.state || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={profile.city || ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="about_me">About Me</Label>
              <Textarea
                id="about_me"
                name="about_me"
                defaultValue={profile.about_me || ''}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sbp_phone">Номер телефона для выплат по СБП</Label>
              <Input
                id="sbp_phone"
                name="sbp_phone"
                defaultValue={profile.sbp_phone || ''}
                placeholder="+7 999 123 45 67"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_id">Telegram ID</Label>
              <Input
                id="telegram_id"
                value={profile.telegram_user_id ? String(profile.telegram_user_id) : 'Не привязан'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{profile.rating}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-2xl font-bold">{profile.level}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-2xl font-bold">{profile.payplan}</p>
              </div>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/profile/finances")}
                  className="gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {language === 'ru' ? 'Финансы' : 'Finance'}
                </Button>
              </div>
            </div>

            {/* Portal Subscription Section */}
            <div className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Тариф портала' : 'Portal Plan'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {currentPlan ? (
                      <>
                        <span className="text-lg font-semibold">{currentPlan.name}</span>
                        <Badge variant={currentPlan.price === 0 ? 'secondary' : 'default'}>
                          {currentPlan.badge_text}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        {language === 'ru' ? 'Не выбран' : 'Not selected'}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangePlanOpen(true)}
                  className="gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {language === 'ru' ? 'Сменить тариф' : 'Change Plan'}
                </Button>
              </div>
            </div>

            {/* Referral Block */}
            {profile?.referral_code && (
              <ReferralBlock 
                referralCode={profile.referral_code} 
                userId={profile.id} 
              />
            )}

            <Button type="submit" className="w-full bg-gradient-primary">
              Save Changes
            </Button>
          </form>
        </Card>
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Выберите тариф' : 'Select Plan'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <PortalSubscriptionSelector
              userId={profile?.id}
              onSubscriptionSelected={() => {
                setChangePlanOpen(false);
                fetchProfile();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
