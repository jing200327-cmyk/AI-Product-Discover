import type { TargetUser, TargetUserIdentificationResult } from "@/packages/shared/types";

const userTypeLabels: Record<TargetUser["userType"], string> = {
  core_user: "核心用户",
  secondary_user: "次级用户",
  influencer: "影响者",
  decision_maker: "付费决策者"
};

const evidenceTypeLabels: Record<TargetUser["evidenceType"], string> = {
  keyword: "来自原始想法关键词",
  scenario_inference: "来自场景推断",
  task_inference: "来自任务推断",
  business_inference: "来自商业关系推断"
};

const confidenceLabels: Record<TargetUser["confidence"], string> = {
  high: "置信度高",
  medium: "置信度中",
  low: "置信度低"
};

const groups: Array<{
  userType: TargetUser["userType"];
  title: string;
}> = [
  { userType: "core_user", title: "核心用户" },
  { userType: "secondary_user", title: "次级用户" },
  { userType: "influencer", title: "影响者" },
  { userType: "decision_maker", title: "付费决策者" }
];

function UserCard({ user }: { user: TargetUser }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-neutral-950">{user.name}</h4>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {user.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className="rounded-md bg-neutral-950 px-2 py-1 text-xs font-medium text-white">
            {userTypeLabels[user.userType]}
          </span>
          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
            {confidenceLabels[user.confidence]}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <p className="font-medium text-neutral-500">依据来源</p>
          <p className="mt-1 text-neutral-800">
            {evidenceTypeLabels[user.evidenceType]}
          </p>
        </div>
        <div>
          <p className="font-medium text-neutral-500">判断依据</p>
          <ul className="mt-2 grid gap-1 text-neutral-800">
            {user.evidence.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function ProductContextCard({
  result
}: {
  result: TargetUserIdentificationResult | null;
}) {
  if (!result) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">
          Step2：目标用户识别
        </h2>
        <p className="mt-3 text-sm text-neutral-500">未开始</p>
      </section>
    );
  }

  if (result.status === "needs_more_info") {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold text-amber-950">
          Step2：目标用户识别
        </h2>
        <p className="mt-3 text-sm leading-6 text-amber-900">
          {result.missingInfoPrompt ??
            "当前想法中缺少明确的用户信息，请补充：这个产品主要给谁用？"}
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Step2：目标用户识别
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              AI 将根据你的产品想法，识别最可能使用该产品的人群，并说明判断依据。
            </p>
          </div>
          <span className="w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            已完成
          </span>
        </div>
      </div>

      {groups.map((group) => {
        const users = result.targetUsers.filter(
          (user) => user.userType === group.userType
        );

        return (
          <section
            key={group.userType}
            className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">
                {group.title}
              </h3>
              <span className="text-xs text-neutral-500">{users.length}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {users.length > 0 ? (
                users.map((user) => <UserCard key={user.id} user={user} />)
              ) : (
                <p className="text-sm text-neutral-500">暂无</p>
              )}
            </div>
          </section>
        );
      })}
    </section>
  );
}
