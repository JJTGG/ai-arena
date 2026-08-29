import ChatInput from "./components/chat-input";

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
          <ChatInput />
        </div>
      </section>
    </main>
  );
}