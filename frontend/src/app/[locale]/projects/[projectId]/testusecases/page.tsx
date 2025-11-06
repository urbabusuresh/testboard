// src/app/[locale]/projects/[projectId]/testusecases/page.tsx
import React from "react";
import TestUsecasesClient from "@/components/testusecases/TestUsecasesClient";

type Props = { params: { locale: string; projectId: string } ;
searchParams: { ucm?: string | any };
};
export default function Page({ params,searchParams }: Props) {
  
  const { projectId } = params; 
const moduleId = searchParams.ucm?? 'all'; 


  return (<div className="p-1">
    <div className="bg-orange-100  rounded">
    <TestUsecasesClient projectIdProp={projectId} moduleId={moduleId} />
    </div></div>);
    
}
