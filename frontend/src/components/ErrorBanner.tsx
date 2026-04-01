import './ErrorBanner.css';

export const ErrorBanner = (props: React.HTMLAttributes<HTMLDivElement>) => {
  if (!props.children) return null;

  return (
    <div className="nb-error-banner" {...props}>
      {props.children}
    </div>
  );
};
