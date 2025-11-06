"use client";
import { Card, CardBody } from "@heroui/react";

export default function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <Card radius="lg" shadow="sm" className="border border-default-200">
        <CardBody>{children}</CardBody>
      </Card>
    </section>
  );
}
