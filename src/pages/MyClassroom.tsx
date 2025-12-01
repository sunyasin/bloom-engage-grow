import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ClassroomBlock {
  id: string;
  block_number: number;
  title: string;
  description: string;
  image_url: string;
  required_rating: number;
  required_payplan: number;
  page_id: string;
}

export default function MyClassroom() {
  const [blocks, setBlocks] = useState<ClassroomBlock[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlocksAndProfile();
  }, []);

  const fetchBlocksAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);
    }

    const { data: blocksData } = await supabase
      .from('classroom_blocks')
      .select('*')
      .order('block_number');

    if (blocksData) {
      setBlocks(blocksData);
    }
  };

  const isBlockEnabled = (block: ClassroomBlock) => {
    if (!userProfile) return false;
    if (block.block_number === 1) return true;
    if (block.block_number === 2) return userProfile.rating > 10 || userProfile.payplan >= 1;
    if (block.block_number === 3) return userProfile.payplan === 1;
    if (block.block_number === 4) return userProfile.payplan === 2;
    return userProfile.payplan > 0;
  };

  const handleBlockClick = (block: ClassroomBlock) => {
    if (isBlockEnabled(block)) {
      navigate(`/classroom/${block.page_id}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          My Classroom
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blocks.map((block) => {
            const enabled = isBlockEnabled(block);
            return (
              <Card
                key={block.id}
                className={`relative p-6 transition-smooth hover:shadow-medium ${
                  enabled ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => handleBlockClick(block)}
              >
                {!enabled && (
                  <div className="absolute top-4 right-4">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                {block.image_url && (
                  <img
                    src={block.image_url}
                    alt={block.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <h3 className="text-xl font-semibold mb-2">{block.title}</h3>
                <p className="text-muted-foreground">{block.description}</p>
                {!enabled && (
                  <p className="text-sm text-accent mt-4">
                    {block.required_rating > 0 && `Requires rating: ${block.required_rating}`}
                    {block.required_payplan > 0 && ` | Requires payplan: ${block.required_payplan}`}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
