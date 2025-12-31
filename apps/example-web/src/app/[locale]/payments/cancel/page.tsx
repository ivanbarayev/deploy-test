"use client";

import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Payment Cancelled
        </h1>
        <p className="mb-4 text-gray-600">
          Your payment was cancelled. No charges have been made.
        </p>
        <Link
          href="/payments"
          className="inline-block rounded bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
