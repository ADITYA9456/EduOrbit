export default function MainLoading() {
  return (
    <>
      <div className="top-progress" />
      <div className="route-loading">
        <div className="skeleton route-loading__bar" style={{ width: '35%' }} />
        <div className="skeleton route-loading__card" />
        <div className="skeleton route-loading__card" />
        <div className="skeleton route-loading__card" />
      </div>
    </>
  );
}
