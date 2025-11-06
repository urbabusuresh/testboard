// src/app/[locale]/projects/[projectId]/referencedocs/page.tsx
import React from "react";
import ReferenceDocsClient from "@/components/referencedocs/ReferenceDocsClient";
export default function Page({ params }: any){ const { projectId } = params; 
return (<div className="p-6"><h1 className="text-2xl mb-4">Reference Docs — Project 
{projectId}</h1><ReferenceDocsClient projectIdProp={projectId} /></div>); }
