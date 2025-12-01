import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    const { data } = await supabase
      .from('classroom_blocks')
      .select('*')
      .order('block_number');

    if (data) {
      setBlocks(data);
    }
  };

  const handleUpdateBlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBlock) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      image_url: formData.get('image_url') as string,
    };

    const { error } = await supabase
      .from('classroom_blocks')
      .update(updates)
      .eq('id', selectedBlock.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Block updated successfully",
      });
      fetchBlocks();
      setSelectedBlock(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-accent">Admin Panel</h1>
        
        <Tabs defaultValue="classroom" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="classroom">Classroom Blocks</TabsTrigger>
            <TabsTrigger value="database">Database Tables</TabsTrigger>
          </TabsList>
          
          <TabsContent value="classroom" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blocks.map((block) => (
                <Card key={block.id} className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{block.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{block.description}</p>
                  <Button onClick={() => setSelectedBlock(block)} variant="outline" size="sm">
                    Edit Block
                  </Button>
                </Card>
              ))}
            </div>

            {selectedBlock && (
              <Card className="p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4">Edit Block {selectedBlock.block_number}</h2>
                <form onSubmit={handleUpdateBlock} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={selectedBlock.title}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={selectedBlock.description}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      name="image_url"
                      defaultValue={selectedBlock.image_url || ''}
                      type="url"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button type="submit" className="bg-gradient-primary">
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setSelectedBlock(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="database" className="mt-6">
            <Card className="p-6">
              <p className="text-muted-foreground">
                Database management interface. Use the backend to view and edit tables.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
