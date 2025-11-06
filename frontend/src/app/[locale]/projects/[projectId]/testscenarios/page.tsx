// src/app/[locale]/projects/[projectId]/testscenarios/page.tsx
import React from "react";
import TestScenariosClient from "@/components/testscenarios/TestScenariosClient";
export default function Page({ params,searchParams }: any)
{ 
const { projectId } = params; 
const useCaseCode = searchParams.uc?? 'all'; 
return (
    <div className="p-1">
<div className="bg-green-100 rounded">
<TestScenariosClient projectIdProp={projectId} useCaseCode={useCaseCode}/>
</div></div>
); 
}
type Props = { params: { locale: string; projectId: string } ;
searchParams: { uc?: string | any };


};

