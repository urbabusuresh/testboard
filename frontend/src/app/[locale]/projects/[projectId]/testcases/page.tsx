// server component
import React from "react";
import TestCasesClient from "@/components/testcases/TestCasesClient";

type Props = { params: { locale: string; projectId: string } ;
searchParams: { ts?: string | any };

};

export default function Page({ params ,searchParams }: Props) {
  const { locale, projectId } = params;
   const tsCode = searchParams.ts ?? 'all'; 
  return (
    <div className="p-1">
<div className="bg-pink-50  rounded">
      {/* <h1 className="text-2xl font-semibold mb-4">Test Cases — Project {projectId}</h1> */}
      <TestCasesClient projectIdProp={projectId} localeProp={locale}   tsCodeProp={tsCode}/>
    </div></div>
  );
}
