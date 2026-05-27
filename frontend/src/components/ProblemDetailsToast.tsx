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
    <div role="alert" className="problem-details-toast">
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {errors && errors.length > 0 && (
        <ul>
          {errors.map((err, i) => {
            const text = typeof err === 'string' ? err : err.mensaje ?? '';
            return <li key={i}>{text}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
