export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          AI Arena
        </p>

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-zinc-950 sm:text-6xl">
          One question.
          <br />
          Multiple AI minds.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
          Compare responses from different AI models in one conversation.
        </p>

        <div className="mt-10 w-full max-w-2xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <textarea
              placeholder="Ask anything..."
              className="min-h-32 w-full resize-none bg-transparent p-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
            />

            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="px-3 text-sm text-zinc-400">
                0 / 4000
              </span>

              <button
                type="button"
                className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Enter Arena
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}