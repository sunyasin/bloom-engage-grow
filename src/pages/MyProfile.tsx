import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

export default function MyProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
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
            </div>

            <Button type="submit" className="w-full bg-gradient-primary">
              Save Changes
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
