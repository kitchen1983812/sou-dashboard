"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
        <h2 className="text-xl font-bold text-red-600">
          エラーが発生しました
        </h2>
        <p className="text-gray-600">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:opacity-80"
        >
          再試行
        </button>
      </body>
    </html>
  );
}
