import Link from "next/link";
import { ListTodo } from "lucide-react";

export type ReviewTask = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export default function SubmittedTaskReview({ tasks }: { tasks: ReviewTask[] }) {
  return tasks.length === 0 ? (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
        <ListTodo className="h-5 w-5 text-slate-500" />
      </div>
      <p className="text-sm text-slate-400">No submitted tasks to review.</p>
      <p className="text-xs text-slate-500 mt-1">Submitted work will appear here for your approval.</p>
    </div>
  ) : (
    <div className="divide-y divide-white/[0.06] max-h-80 overflow-y-auto">
      {tasks.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 hover:bg-white/[0.04] transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full shrink-0 bg-sky-400" />
              <p className="text-sm font-medium text-white truncate">{item.title}</p>
            </div>
            <p className="text-xs text-slate-500 truncate ml-3.5">{item.subtitle}</p>
          </div>
          <span className="badge text-[10px] shrink-0 whitespace-nowrap capitalize bg-sky-400/10 text-sky-300 border-sky-400/20">
            Review
          </span>
        </Link>
      ))}
    </div>
  );
}