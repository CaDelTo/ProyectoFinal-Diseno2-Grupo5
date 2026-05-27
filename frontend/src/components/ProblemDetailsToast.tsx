interface ErrorItem {
  campo?: string;
  mensaje?: string;
}

interface ProblemDetailsProps {
  problem: {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    errors?: Array<ErrorItem | string>;
  };
}

export function ProblemDetailsToast({ problem }: ProblemDetailsProps) {
  const { title, detail, errors } = problem;

  return (
    <div
      role="alert"
      className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <svg
        className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-red-800">{title}</p>
        {detail && <p className="text-sm text-red-700 mt-0.5">{detail}</p>}
        {errors && errors.length > 0 && (
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            {errors.map((err, i) => {
              const text = typeof err === 'string' ? err : err.mensaje ?? '';
              return (
                <li key={i} className="text-sm text-red-700">
                  {text}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
