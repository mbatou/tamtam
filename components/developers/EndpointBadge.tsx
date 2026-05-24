interface EndpointBadgeProps {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
}

const methodColors = {
  GET: "bg-[#1D9E75]/15 text-[#1D9E75]",
  POST: "bg-[#D35400]/15 text-[#D35400]",
  PUT: "bg-[#F39C12]/15 text-[#F39C12]",
  DELETE: "bg-red-500/15 text-red-400",
};

export default function EndpointBadge({ method, path }: EndpointBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-code tracking-wide ${methodColors[method]}`}>
        {method}
      </span>
      <code className="text-[14px] font-code text-white/80">{path}</code>
    </div>
  );
}
