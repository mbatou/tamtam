interface ApiParamProps {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export default function ApiParam({ name, type, required, description }: ApiParamProps) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-white/[0.05] last:border-b-0">
      <div className="flex items-center gap-2 shrink-0 min-w-[160px]">
        <code className="text-[12px] font-code text-[#79C0FF]">{name}</code>
        {required && (
          <span className="text-[9px] font-dm font-semibold text-[#D35400] uppercase tracking-wide">req</span>
        )}
      </div>
      <span className="text-[11px] font-code text-white/25 shrink-0 min-w-[60px]">{type}</span>
      <span className="text-[12px] font-dm text-white/45">{description}</span>
    </div>
  );
}
