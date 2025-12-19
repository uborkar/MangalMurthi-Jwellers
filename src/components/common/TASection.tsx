import React from "react";


interface TASectionProps {
title?: React.ReactNode;
subtitle?: React.ReactNode;
children: React.ReactNode;
className?: string;
}


export default function TASection({ title, subtitle, children, className = "" }: TASectionProps) {
return (
<section className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 md:p-6 ${className}`}>
{title && (
<div className="mb-4 flex items-start justify-between gap-4">
<div>
<h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
{subtitle && (
<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
)}
</div>
</div>
)}
<div>{children}</div>
</section>
);
}