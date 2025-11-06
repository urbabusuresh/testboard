// src/app/[locale]/projects/[projectId]/referencedocs/page.tsx
import React from "react";
import ReferenceDocsClient from "@/components/referencedocs/ReferenceDocsClient";
import AiChat from "@/components/aichatbot/AiChat";
export default function Page({ params }: any){ const { projectId } = params;
 return (
 <div className="p-2">
   
 <AiChat  />
 
 </div>
 
); 
 
}
