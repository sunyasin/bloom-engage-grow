import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ClassroomPage() {
  const { pageId } = useParams();
  const [pageContent, setPageContent] = useState("");

  useEffect(() => {
    fetchPageContent();
  }, [pageId]);

  const fetchPageContent = async () => {
    if (!pageId) return;

    const { data } = await supabase
      .from('classroom_pages')
      .select('html_content')
      .eq('id', pageId)
      .single();

    if (data) {
      setPageContent(data.html_content || '');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div
        className="prose prose-lg max-w-4xl mx-auto"
        dangerouslySetInnerHTML={{ __html: pageContent }}
      />
    </div>
  );
}
