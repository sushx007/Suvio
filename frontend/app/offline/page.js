export default function Offline() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#09090B] text-white p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-3xl font-semibold tracking-tight">You're offline</h1>
        <p className="mt-2 text-white/60 text-sm">Suvio needs a connection to sync your latest data. We'll pick up where you left off as soon as you're back online.</p>
      </div>
    </div>
  );
}
