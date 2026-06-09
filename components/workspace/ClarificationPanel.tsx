import type {
  ClarificationAnswer,
  ClarificationQuestion
} from "@/packages/shared/types";

export function ClarificationPanel({
  questions,
  answers
}: {
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-neutral-950">澄清问题</h2>
      <div className="mt-4 grid gap-3">
        {questions.map((question) => {
          const answer = answers.find((item) => item.questionId === question.id);

          return (
            <div key={question.id} className="border-t border-neutral-100 pt-3">
              <p className="font-medium text-neutral-900">{question.question}</p>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                {question.reason}
              </p>
              <p className="mt-2 text-sm text-teal-800">
                {answer?.answer ?? "等待回答"}
              </p>
            </div>
          );
        })}
        {questions.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无澄清问题。</p>
        ) : null}
      </div>
    </section>
  );
}
