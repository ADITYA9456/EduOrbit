export const metadata = {
  title: 'Offline | EduOrbite',
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="status-page">
      <p className="status-page__code" aria-hidden="true">Offline</p>
      <h1 className="status-page__title">You are not connected</h1>
      <p className="status-page__text">
        Videos, problems and contests need a connection. Pages you opened recently may still load.
        Reconnect and try again.
      </p>
      <div className="status-page__actions">
        <a href="/home" className="btn btn--primary">Try again</a>
      </div>
    </main>
  );
}
