export function LoadingDino() {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status">
      <div className="text-6xl animate-bounce">🦖</div>
      <p className="mt-4 text-lg font-bold text-purple-700">
        ¡Excavando tu dinosaurio único!
      </p>
    </div>
  );
}
