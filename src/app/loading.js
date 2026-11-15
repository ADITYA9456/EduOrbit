export default function Loading() {
  return (
    <>
      <div className="top-progress" />
      <div className="route-loading" style={{ padding: 24 }}>
        <div className="skeleton route-loading__bar" style={{ width: '40%' }} />
        <div className="skeleton route-loading__card" />
        <div className="skeleton route-loading__card" />
      </div>
    </>
  );
}
