"use client";

import type {
  AIMessage,
  AIProviderId,
  AIResponse,
} from "../../lib/ai/types";

type ProviderRoundState =
  | "idle"
  | "thinking"
  | "complete"
  | "failed";

type ResponseCardProps = {
  providerId: AIProviderId;
  messages: AIMessage[];
  latestResponse?: AIResponse;
  status: ProviderRoundState;
  roundNumber: number;
  currentPrompt: string;
  error?: string;
};

function getProviderMeta(
  providerId: AIProviderId,
) {
  if (providerId === "google") {
    return {
      name: "Gemini",
      accent: "magenta" as const,
    };
  }

  return {
    name: "ChatGPT",
    accent: "cyan" as const,
  };
}

function getLastMessage(
  messages: AIMessage[],
  role: AIMessage["role"],
) {
  return [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === role,
    );
}

export default function ResponseCard({
  providerId,
  messages,
  latestResponse,
  status,
  roundNumber,
  currentPrompt,
  error,
}: ResponseCardProps) {
  const provider =
    getProviderMeta(
      providerId,
    );

  const lastPrompt =
    getLastMessage(
      messages,
      "user",
    );

  const lastResponse =
    getLastMessage(
      messages,
      "assistant",
    );

  const prompt =
    currentPrompt ||
    lastPrompt?.content ||
    "";

  const response =
    latestResponse?.content ||
    lastResponse?.content ||
    "";

  const olderMessages =
    messages.length > 2
      ? messages.slice(0, -2)
      : [];

  const laneClass = `arena-response-lane arena-response-lane--${provider.accent} ${
    status === "failed"
      ? "arena-response-lane--failed"
      : ""
  }`;

  return (
    <article className={laneClass}>
      <header className="arena-response-lane__header">
        <div className="arena-response-lane__identity">
          <h3 className="arena-response-lane__name">
            <span className="arena-response-lane__dot" />

            {provider.name}
          </h3>

          <p className="arena-response-lane__type">
            Entrant
          </p>
        </div>

        <span className="arena-response-lane__status">
          {status === "thinking"
            ? "Thinking"
            : status === "complete"
              ? "Complete"
              : status === "failed"
                ? "Failed"
                : response
                  ? "Last result"
                  : "Ready"}
        </span>
      </header>

      {status === "thinking" ? (
        <div className="arena-response-lane__thinking">
          <span className="arena-response-lane__thinking-title">
            Round{" "}
            {String(
              roundNumber,
            ).padStart(2, "0")}{" "}
            · Responding
          </span>

          <div className="arena-thinking-bars">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : (
        <div className="arena-response-lane__body">
          {prompt && (
            <div className="arena-response-lane__prompt">
              <span className="arena-response-lane__prompt-label">
                Prompt
              </span>

              <p className="arena-response-lane__prompt-text">
                {prompt}
              </p>
            </div>
          )}

          {status ===
            "failed" && (
            <div className="arena-response-lane__response">
              <div className="arena-response-lane__failure">
                <span className="arena-response-lane__failure-label">
                  Round failed
                </span>

                <p className="arena-response-lane__failure-text">
                  {error ||
                    `${provider.name} could not complete this round.`}
                </p>
              </div>
            </div>
          )}

          {status !== "failed" &&
            response && (
              <div className="arena-response-lane__response">
                <span className="arena-response-lane__response-label">
                  Response
                </span>

                <p className="arena-response-lane__response-text">
                  {response}
                </p>
              </div>
            )}

          {!response &&
            status !== "failed" &&
            !prompt && (
              <div className="arena-response-lane__thinking">
                <span className="arena-response-lane__thinking-title">
                  Awaiting first round
                </span>
              </div>
            )}

          {olderMessages.length >
            0 && (
            <details className="arena-response-lane__history">
              <summary>
                Earlier exchanges
              </summary>

              <div className="arena-response-lane__history-items">
                {olderMessages.map(
                  (
                    message,
                    index,
                  ) => (
                    <div
                      key={`${message.role}-${index}`}
                      className="arena-response-lane__history-item"
                    >
                      <span className="arena-response-lane__history-label">
                        {message.role ===
                        "user"
                          ? "Prompt"
                          : provider.name}
                      </span>

                      <p className="arena-response-lane__history-text">
                        {
                          message.content
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </article>
  );
}