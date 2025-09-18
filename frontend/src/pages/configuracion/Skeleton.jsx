import './Skeleton.scss';

export default function Skeleton() {
  return (
    <div className="configuracion">
      <div className="hero hero--config skeleton">
        <div className="skeleton-line w-40" />
        <div className="skeleton-line w-60" />
      </div>

      <section className="config__grid">
        <div className="card skeleton">
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-100" />
          <div className="skeleton-line w-80" />
        </div>
        <div className="card skeleton">
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-100" />
          <div className="skeleton-line w-50" />
        </div>
        <div className="card skeleton">
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-100" />
          <div className="skeleton-line w-60" />
        </div>
      </section>
    </div>
  );
}
