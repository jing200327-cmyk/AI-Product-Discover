"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandBadge } from "@/components/landing/BrandBadge";
import { IdeaInputCard } from "@/components/landing/IdeaInputCard";
import { ProcessChips } from "@/components/landing/ProcessChips";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type ProjectResponse = {
  id: string;
  name: string;
};

export default function Home() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const startDiscovery = async () => {
    const trimmedIdea = idea.trim();

    if (!trimmedIdea) {
      setError("请先输入你的产品想法");
      return;
    }

    setError("");
    setIsStarting(true);

    try {
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: trimmedIdea.slice(0, 48),
          productIdea: trimmedIdea
        })
      });
      const projectResult =
        (await projectResponse.json()) as ApiResponse<ProjectResponse>;

      if (!projectResult.success || !projectResult.data) {
        throw new Error(projectResult.error?.message ?? "项目创建失败");
      }

      const runResponse = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId: projectResult.data.id,
          productIdea: trimmedIdea,
          autoAnswerClarification: true
        })
      });
      const runResult = (await runResponse.json()) as ApiResponse<unknown>;

      if (!runResult.success) {
        throw new Error(runResult.error?.message ?? "Agent 启动失败");
      }

      router.push(`/projects/${projectResult.data.id}`);
    } catch {
      setError("产品发现启动失败，请稍后重试");
      setIsStarting(false);
    }
  };

  const updateIdea = (nextIdea: string) => {
    setIdea(nextIdea);

    if (error && nextIdea.trim()) {
      setError("");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8FAFC] px-5 py-8 text-[#0F172A] sm:px-6">
      <div className="pointer-events-none absolute left-[-14rem] top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),rgba(37,99,235,0)_68%)]" />
      <div className="pointer-events-none absolute bottom-[-16rem] right-[-12rem] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.20),rgba(79,70,229,0)_68%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#F8FAFC_0%,#F4F7FF_48%,#EEF2FF_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full py-8 text-center">
          <BrandBadge />

          <h1 className="mx-auto mt-10 max-w-4xl text-5xl font-bold tracking-normal text-[#0F172A] sm:text-6xl">
            AI 产品发现助手
          </h1>

          <p className="mx-auto mt-6 max-w-[760px] text-lg leading-8 text-[#64748B]">
            把一个模糊的产品想法，转化为清晰的用户洞察、需求结构和可验证方案
          </p>

          <div className="mt-10">
            <IdeaInputCard
              error={error}
              idea={idea}
              isLoading={isStarting}
              onIdeaChange={updateIdea}
              onStart={startDiscovery}
            />
          </div>

          <div className="mt-8">
            <ProcessChips />
          </div>
        </section>
      </div>
    </main>
  );
}
