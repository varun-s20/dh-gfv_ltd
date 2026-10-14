import { SearchX } from "lucide-react";
import Link from "next/link";
import { btn, cardClass } from "@/components/admin/styles";
import { EmptyState } from "@/components/admin/ui";

export default function LeadNotFound() {
  return (
    <div className={cardClass("mx-auto mt-10 max-w-lg")}>
      <EmptyState
        icon={<SearchX aria-hidden />}
        title="We can't find that lead"
        action={
          <Link href="/admin/leads" className={btn("primary", "md")}>
            Back to leads
          </Link>
        }
      >
        The link may be wrong, or the lead was removed. Search by reference or registration instead.
      </EmptyState>
    </div>
  );
}
