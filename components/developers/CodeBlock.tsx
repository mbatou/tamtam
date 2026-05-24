"use client";

import { useState, useCallback } from "react";
import { Copy, Check, FileCode } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language: "js" | "ts" | "tsx" | "bash" | "python" | "json" | "html";
  filename?: string;
  showLineNumbers?: boolean;
}

export default function CodeBlock({ code, language, filename, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split("\n");

  return (
    <div className="rounded-[12px] overflow-hidden border border-white/[0.07]">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#161B22] border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-white/25" />
            <span className="text-[11px] text-white/35 font-code">{filename}</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1 font-dm"
          >
            {copied ? <Check className="w-3 h-3 text-[#1D9E75]" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      )}
      {!filename && (
        <div className="flex items-center justify-end px-4 py-2 bg-[#161B22] border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/20 font-code uppercase">{language}</span>
            <button
              onClick={copyToClipboard}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1 font-dm"
            >
              {copied ? <Check className="w-3 h-3 text-[#1D9E75]" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>
      )}
      <pre className="bg-[#0D1117] p-5 overflow-x-auto text-[12px] leading-[1.8] scrollbar-hide">
        <code className={`language-${language} font-code`}>
          {showLineNumbers
            ? lines.map((line, i) => (
                <span key={i}>
                  <span className="inline-block w-8 text-right mr-4 text-white/15 select-none">{i + 1}</span>
                  {line}
                  {i < lines.length - 1 ? "\n" : ""}
                </span>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
