export default function Page() {
  return (
    <div className="mx-auto max-w-[var(--cc-content-maxw)] p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="opacity-80 mt-2">Demo content. Scroll to test independent main scroll.</p>
      <ul className="mt-6 space-y-4">
        {Array.from({ length: 80 }).map((_, i) => (
          <li key={i} className="p-4 rounded-lg border" style={{ borderColor: "var(--cc-border)" }}>
            Item {i + 1}
          </li>
        ))}
      </ul>
    </div>
  );
}
