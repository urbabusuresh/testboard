// src/app/[locale]/projects/[projectId]/testusecases/page.tsx
import React from "react";
import UploadExcelSyncClient from "@/components/uploadtestcasedata/UploadExcelSyncClient";

type Props = { params: { locale: string; projectId: string } ;
searchParams: { ucm?: string | any };
};
export default function Page({ params,searchParams }: Props) {
  
  const { projectId } = params; 
const moduleId = searchParams.ucm?? 'all'; 


  return (<div className="p-1">
    <div className="bg-pink-100  rounded">
    <UploadExcelSyncClient projectId={projectId}/>
    </div></div>);
    
}
