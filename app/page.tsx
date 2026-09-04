{selectedProviders.map((providerId) => {
  const providerHistory = history[providerId];

  if (!providerHistory || providerHistory.length === 0) {
    return null;
  }

  return (
    <article
      key={providerId}
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-wide text-[var(--foreground)]">
          {providerId}
        </h2>

        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
          Response
        </span>
      </div>

      <div className="space-y-3 p-4">
        {providerHistory.map((message, index) => (
          <div
            key={`${providerId}-${index}`}
            className={
              message.role === "user"
                ? "rounded-xl border border-[var(--accent)]/20 bg-[var(--surface-raised)] p-4"
                : "rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
            }
          >
            <p
              className={`mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.2em] ${
                message.role === "user"
                  ? "text-[var(--accent)]"
                  : "text-[var(--foreground-subtle)]"
              }`}
            >
              {message.role === "user" ? "You" : providerId}
            </p>

            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
})}