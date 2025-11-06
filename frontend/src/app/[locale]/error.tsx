'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global UI Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center">
      <h2 className="text-2xl font-semibold text-red-600 mb-4">
        Something went wrong!
      </h2>
      <p className="text-gray-600 mb-6">
        A system error occurred while rendering this page.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
